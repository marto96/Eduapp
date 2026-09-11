# Solicitud de documentos self-service — Diseño

**Contexto:** Gap identificado en el análisis competitivo vs. Q10 (`project_q10_competitive_analysis` memory), verificado como no implementado el 2026-09-11: hoy `documents` es puramente admin-issue-only (`apps/api/src/modules/documents/interface/controllers/documents.controller.ts`) — secretaría emite un documento sin que nadie lo haya pedido, y el estudiante/acudiente solo puede leer/descargar lo que ya existe.

**Objetivo:** El estudiante/acudiente pide un documento desde su portal. Si el tipo tiene costo, paga en línea (mismo mecanismo de Wompi que ya usan las pensiones) y el sistema genera el documento solo, sin intervención de secretaría. El único paso manual que queda es la entrega física cuando el documento se pidió impreso — eso no se puede automatizar. Además, se agrega un sistema de notificaciones genérico (nuevo en la app) para avisarle a secretaría/administrativos cuando algo necesita su acción.

## Alcance

Incluye:
1. Precio configurable por tipo de documento (0 = gratis).
2. Solicitud de documento (tipo + forma de entrega + nota opcional) desde el portal de familia/estudiante.
3. Cobro automático vía el cargo/pago existente (Wompi) cuando el tipo tiene costo.
4. Generación automática del PDF (reutilizando `IssueDocumentUseCase`) apenas se paga, o de inmediato si es gratis.
5. Cola de "listos para imprimir y entregar" para secretaría, con acción de marcar entregado — el único paso humano inevitable.
6. Sistema de notificaciones genérico (campana en el header + widget en el panel), con la solicitud de documentos como primer y único emisor por ahora.

Fuera de alcance (explícitamente no se construye en esta pasada):
- Rechazo de una solicitud ya pagada con reembolso — un rechazo solo es posible mientras está `pendiente_pago` (ver estados abajo).
- Notificaciones por email — la campana + widget in-app cubren el caso pedido; no hay ningún otro flujo en la app que mande email por un evento de este tipo, así que no se agrega el primero acá.
- Historial de precios (versionado) — el precio de un tipo de documento es un valor único, editable, sin histórico.

## Modelo de dominio

### `ChargeConcept` (extensión)

`apps/api/src/modules/finance/domain/entities/charge.entity.ts` — agregar `'documento'` a la unión existente (`'matricula' | 'pension' | 'solicitud_admision' | 'otro'`). No necesita guarda de duplicados como `matricula`/`pension` (varios cargos de tipo `documento` por matrícula son legítimos — cada solicitud paga el suyo).

### `DocumentTypePrice` (nueva, módulo `documents`)

```ts
export class DocumentTypePrice {
  constructor(
    public readonly type: DocumentType, // clave única — un precio por tipo
    public amount: number,              // 0 = gratis
  ) {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
  }

  updateAmount(amount: number): void {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    this.amount = amount;
  }
}
```

Un tipo sin fila en esta tabla se trata como gratis (`amount = 0`) — no hace falta poblarla para los 4 tipos existentes de entrada; secretaría la completa desde la UI cuando quiera cobrar por alguno.

### `DocumentRequest` (nueva, módulo `documents`)

```ts
export type DocumentRequestStatus =
  | 'pendiente_pago'       // tiene costo, cargo sin pagar todavía
  | 'lista_para_imprimir'  // pagada/gratis, PDF generado, entrega física pendiente
  | 'lista'                // pagada/gratis, PDF generado, entrega digital — ya se puede descargar
  | 'entregada'            // entrega física confirmada por secretaría
  | 'rechazada';           // secretaría la rechazó (solo posible en 'pendiente_pago')

export type DeliveryMethod = 'digital' | 'fisico';

export class DocumentRequest {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly type: DocumentType,
    public readonly deliveryMethod: DeliveryMethod,
    public readonly note: string | null,
    public readonly requestedBy: string,
    public readonly requestedAt: string,
    public status: DocumentRequestStatus,
    public chargeId: string | null = null,
    public issuedDocumentId: string | null = null,
    public resolvedBy: string | null = null,
    public resolvedAt: string | null = null,
    public rejectionReason: string | null = null,
  ) {}

  markReady(issuedDocumentId: string): void {
    this.issuedDocumentId = issuedDocumentId;
    this.status = this.deliveryMethod === 'digital' ? 'lista' : 'lista_para_imprimir';
  }

  markDelivered(staffUserId: string): void {
    if (this.status !== 'lista_para_imprimir') {
      throw new Error('Solo se puede entregar una solicitud que está lista para imprimir');
    }
    this.status = 'entregada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
  }

  reject(staffUserId: string, reason: string): void {
    if (this.status !== 'pendiente_pago') {
      throw new Error('Solo se puede rechazar una solicitud que todavía no fue pagada');
    }
    this.status = 'rechazada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
    this.rejectionReason = reason;
  }
}
```

### `Notification` (nuevo módulo `notifications`)

```ts
export class Notification {
  constructor(
    public readonly id: string,
    public readonly recipientUserId: string,
    public readonly type: string,   // string libre, ej. 'document_request_ready_to_print' — extensible a futuro sin migraciones
    public readonly title: string,
    public readonly body: string,
    public readonly link: string,   // ruta relativa del frontend a la que navega al hacer click, ej. "/documents?tab=solicitudes"
    public readonly createdAt: string,
    public readAt: string | null = null,
  ) {}

  markRead(): void {
    if (!this.readAt) this.readAt = new Date().toISOString();
  }
}
```

Cada notificación pertenece a UN usuario (`recipientUserId`) — un evento que debe avisarle a varios administrativos genera una fila por destinatario (fan-out al crear, no al leer). Con la cantidad de admin/secretaria típica de un colegio (unas pocas decenas como mucho), esto es más simple que modelar una notificación "por rol" con estado de lectura por usuario.

## Flujo completo

```
Estudiante/acudiente pide documento (tipo + entrega + nota)
  │
  ├─ tipo tiene precio > 0 ──► DocumentRequest (pendiente_pago) + Charge (concepto 'documento')
  │                              │
  │                              ▼
  │                          Paga desde el portal (checkout Wompi existente)
  │                              │
  │                              ▼
  │                    Webhook confirma pago → cargo saldado
  │                              │
  │                              ▼
  └─ tipo es gratis ──────► genera el documento ya (reusa IssueDocumentUseCase)
                                 │
                                 ▼
                    DocumentRequest.markReady(issuedDocumentId)
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              entrega = digital         entrega = físico
              status = 'lista'          status = 'lista_para_imprimir'
              (ya se puede bajar          + Notification a cada
               el PDF, sin paso            admin/directivo/secretaria
               manual)                      del colegio
                                             │
                                             ▼
                                   Secretaría imprime/firma en persona
                                   y marca "Entregado" → 'entregada'
```

## Backend

### `documents` — casos de uso nuevos

- `ListDocumentTypePricesUseCase` — `GET /documents/types/prices`, cualquier usuario autenticado (el formulario de solicitud necesita saber el precio antes de pedir).
- `SetDocumentTypePriceUseCase` — `PUT /documents/types/prices/:type` `{amount}`, CASL `manage Document` (ya lo tienen secretaria/directivo/admin_institucion).
- `RequestDocumentUseCase` — `POST /documents/requests` `{enrollmentId, type, deliveryMethod, note?}`, CASL `create DocumentRequest` (nuevo subject, ver abajo). Valida acceso a `enrollmentId` vía `EnrollmentAccessService.resolveAccessibleEnrollmentIds` (mismo patrón que `ListDocumentsUseCase`). Inyecta `IssueDocumentUseCase` directamente (no duplica su lógica de generación de PDF). Si el precio del tipo es 0: llama `issueDocument.execute({enrollmentId, type, description: <tipo legible>, issuedAt: hoy, issuedBy: requestedBy})`, guarda el `DocumentRequest` ya con `markReady(issuedDocument.id)` aplicado (queda en `lista`/`lista_para_imprimir` según `deliveryMethod`). Si el precio es > 0: crea el `Charge` (concepto `documento`, `enrollmentId`, `description` = tipo legible, `amount` = precio, `dueDate` = hoy) vía `CreateChargeUseCase` inyectado, y guarda el `DocumentRequest` en `pendiente_pago` con `chargeId` seteado — sin llamar a `IssueDocumentUseCase` todavía.
- `CompleteDocumentPaymentUseCase` — NO expuesto vía HTTP; lo llama `HandlePaymentWebhookUseCase` (finance) cuando un `Charge` de concepto `documento` queda saldado. Busca el `DocumentRequest` por `chargeId`, inyecta y llama `IssueDocumentUseCase.execute({enrollmentId: request.enrollmentId, type: request.type, description: <tipo legible>, issuedAt: hoy, issuedBy: request.requestedBy})`, aplica `request.markReady(issuedDocument.id)` y guarda, y si `deliveryMethod === 'fisico'` dispara las notificaciones (ver abajo).
- `ListDocumentRequestsUseCase` — `GET /documents/requests`, mismo scoping por `EnrollmentAccessService` que `ListDocumentsUseCase` — el solicitante ve las suyas/las de sus hijos, secretaría/directivo/admin ven todas (con filtro opcional por `status` para la cola de "listos para imprimir").
- `RejectDocumentRequestUseCase` — `PATCH /documents/requests/:id/reject` `{reason}`, CASL `manage DocumentRequest`.
- `MarkDocumentRequestDeliveredUseCase` — `PATCH /documents/requests/:id/deliver`, CASL `manage DocumentRequest`.

### `finance` — cambio en `HandlePaymentWebhookUseCase`

Después de `recordApprovedPayment.execute(payment, attempt)`: cargar el `Charge` (`attempt.chargeId`), y si `charge.concept === 'documento'`, calcular el saldo (mismo cálculo que ya usa `CreatePaymentCheckoutUseCase`: `amount - discountAmount - sum(payments no anulados)`); si `balance <= 0`, llamar a `CompleteDocumentPaymentUseCase.execute(charge.id)`.

**Dependencia circular:** `FinanceModule` necesita `CompleteDocumentPaymentUseCase` de `DocumentsModule`; `DocumentsModule` necesita `CreateChargeUseCase`/`ChargeRepositoryPort` de `FinanceModule` para crear el cargo. Ninguno de los dos importa hoy al otro ni comparte un módulo intermedio que cree un ciclo más largo (ambos comparten solo `EnrollmentModule`/`IdentityModule`, que no importan a ninguno de los dos) — a diferencia del caso de `ScheduleModule`/`CommunicationModule` de la feature de clase virtual, acá el ciclo es de 2 nodos limpio. Se resuelve igual: `forwardRef()` en ambos `imports`, y agregar `CompleteDocumentPaymentUseCase` a los `exports` de `DocumentsModule`. Verificar con un boot real de Nest (`NestFactory.create`), no solo con tests unitarios — ya se demostró en la feature anterior que los tests unitarios (que instancian los use-cases a mano) no detectan un ciclo de módulos roto.

### `notifications` — módulo nuevo

- `CreateNotificationUseCase` — no expuesto vía HTTP, lo llaman otros módulos (inyectado, sin controller propio para crear).
- `ListMyNotificationsUseCase` — `GET /notifications` — las últimas 20 del `currentUser.sub`, sin filtro de rol ni CASL (como `/auth/me`: cada quien ve solo lo suyo, resuelto por `currentUser.sub`, no por permiso de tipo de recurso).
- `CountUnreadNotificationsUseCase` — `GET /notifications/unread-count`.
- `MarkNotificationReadUseCase` — `PATCH /notifications/:id/read`.
- `MarkAllNotificationsReadUseCase` — `PATCH /notifications/read-all`.

`DocumentsModule` importa `NotificationsModule` directamente (sin `forwardRef`, no hay ciclo — `NotificationsModule` no necesita nada de `documents`). Cuando `CompleteDocumentPaymentUseCase` (o `RequestDocumentUseCase`, para el caso gratis) deja una solicitud en `lista_para_imprimir`, resuelve la lista de destinatarios con `UserRepositoryPort.findAll({role: 'admin_institucion'})` + `findAll({role:'directivo'})` + `findAll({role:'secretaria'})` (deduplicados por id), y llama `CreateNotificationUseCase.execute(...)` una vez por destinatario con `type: 'document_request_ready_to_print'`, `link: '/documents?tab=solicitudes'`.

### CASL — reglas nuevas

En `apps/api/src/core/auth/casl/ability.factory.ts`:
- Bloque compartido de estudiante/docente/secretaria/padre_tutor (línea ~96-113, el mismo que ya tiene `can('read', [...])`): agregar `'DocumentRequest'` a ese array de lectura — así todos pueden LEER (sus propias, scoped por `EnrollmentAccessService`) solicitudes.
- Bloque de estudiante/padre_tutor específicamente (hoy solo `padre_tutor` tiene un `can('create', 'GuardianLink')` propio, línea ~126-132): agregar `can('create', 'DocumentRequest')` para `estudiante` Y `padre_tutor` — a diferencia de `GuardianLink`, acá los dos roles pueden crear.
- `admin_institucion`/`directivo` (línea ~31-54, `can('manage', [...])`): agregar `'DocumentRequest'` al array — ya incluye `'Document'`, se suma junto a ese.
- `secretaria` (línea ~81-90, su propio `can('manage', [...])`): agregar `'DocumentRequest'` — ya incluye `'Document'`.

## Frontend

### Portal de familia / panel de estudiante

- Dentro de la pestaña "Documentos" que ya existe en `child-summary-card.tsx` (portal) y su equivalente para estudiante: botón "Solicitar documento" → formulario (tipo — con el precio mostrado al lado si tiene costo —, forma de entrega con radio digital/físico, nota opcional).
- Al confirmar: si el tipo es gratis, la solicitud aparece lista al toque. Si tiene costo, se muestra un botón "Pagar" que abre el checkout de Wompi (mismo patrón ya usado para pagar cargos de pensión desde el portal — reutilizar ese componente/hook, no duplicar la integración con Wompi).
- Lista de solicitudes propias con badge de estado (pendiente de pago / lista para imprimir / lista para descargar / entregada / rechazada — con motivo si fue rechazada).

### Panel de administración

- Página `/documents` existente: nueva pestaña "Solicitudes" con la cola filtrable por estado — foco en `lista_para_imprimir` (las que necesitan acción), botón "Marcar entregado" por fila, y botón "Rechazar" (con motivo) para las que están en `pendiente_pago`.
- Nueva sección (misma página o una `/documents/precios`) para editar el precio de cada tipo de documento — lista simple de los 4 tipos con un input de monto cada uno.
- Nuevo widget en el panel (`apps/web/src/features/dashboard/components/`), visible solo para `admin_institucion`/`directivo`/`secretaria`, mostrando la cantidad de solicitudes en `lista_para_imprimir` — mismo patrón visual que `PendingChargesWidget`.

### Campana de notificaciones (nueva, genérica)

- Nuevo componente `NotificationBell` en el header de `(dashboard)/layout.tsx`, al lado de `ThemeToggle` — ícono de campana con un punto/contador si hay no leídas.
- Hook `use-notifications.ts` (`apps/web/src/features/notifications/`): `useNotifications()` (lista, `refetchInterval: 20000` — mismo intervalo que ya usa `useUnreadMessagesCount`), `useUnreadNotificationCount()`, `useMarkNotificationRead()`, `useMarkAllNotificationsRead()`.
- Al hacer click en la campana: popover con las notificaciones recientes (no leídas resaltadas, hora relativa), click en una navega a su `link` y la marca leída; botón "Marcar todas como leídas" arriba del panel.
- Sin esta feature no existe ningún ícono de notificaciones en la app — se construye desde cero, pero de forma genérica (tipo string libre) para que otros eventos futuros lo reutilicen sin tocar el modelo de datos.

## Testing

- Unit tests por caso de uso nuevo, mismo patrón que el resto del repo (mocks de los ports, `jest.clearAllMocks()` en `beforeEach`) — especialmente: `RequestDocumentUseCase` (gratis vs. con costo, acceso denegado a un `enrollmentId` ajeno), `CompleteDocumentPaymentUseCase` (marca lista/lista_para_imprimir según `deliveryMethod`, dispara notificaciones solo si físico), `DocumentRequest.reject`/`markDelivered` (transiciones inválidas lanzan error).
- Verificación en vivo: boot real de la API (`node dist/main.js` o `npm run dev`, no solo `npm test`) después de conectar `FinanceModule`↔`DocumentsModule` con `forwardRef()`, para confirmar que el grafo de módulos resuelve — igual que se hizo para la feature de clase virtual.
