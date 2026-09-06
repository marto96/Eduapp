# Notificaciones por correo (admisión, estado de pago, recordatorio de pensión) — diseño

**Fecha:** 2026-09-06
**Estado:** Aprobado en conversación, pendiente de plan de implementación.

## Motivación

Hoy la plataforma solo notifica dentro de sí misma (mensajería interna,
usada por ejemplo para avisar de una nota nueva — ver
`apps/api/src/modules/grading/application/services/notify-new-grade.service.ts`).
Eso funciona para usuarios ya registrados, pero deja dos casos sin cubrir:

- **Solicitantes de admisión no tienen cuenta en la plataforma.**
  `CreateAdmissionApplicationUseCase` solo guarda `guardianEmail` suelto
  (`apps/api/src/modules/admissions/application/use-cases/create-admission-application.use-case.ts:26`),
  sin ningún usuario asociado — la mensajería interna no puede alcanzarlos
  porque requiere un `recipientId` de un usuario real.
- **Nadie se entera de una pensión vencida a menos que entre a mirar.** No
  existe ningún mecanismo de recordatorio — solo un chequeo on-demand
  (`OverdueBalanceChecker`) usado únicamente para bloquear la
  re-matrícula, sin ningún disparador periódico.

Se pide agregar correo saliente para: confirmación al enviar una solicitud
de admisión, avisos de cambio de estado del trámite/pago, y un recordatorio
automático cuando una pensión pasa su fecha de plazo.

## Alcance

- Un `EmailPort` nuevo, con una implementación sobre **Resend** (elegido
  por ser el más simple de integrar en Nest).
- Un módulo de **plantillas de correo editables por tenant** desde el día
  uno (no texto fijo) — cada colegio vive en su propio schema y puede
  querer su propio tono/redacción, igual que el resto de su contenido.
  Cada tipo de correo trae un texto por defecto en código como *fallback*
  si el tenant nunca lo personaliza.
- Cuatro disparadores de correo sobre el flujo de admisión ya existente
  (solicitud recibida, pago aprobado, pago rechazado, solicitud
  aceptada/rechazada).
- Un recordatorio diario de pensión vencida — **solo concepto `pension`**,
  **una sola vez por cargo** (no se reenvía todos los días mientras siga
  impago).

**Fuera de alcance para esta versión:**
- Recordatorio para otros conceptos de cargo (`matricula`, `otro`) — el
  criterio genérico de `OverdueBalanceChecker` ya lo soportaría si se pide
  después, pero se deja acotado a pensión por ahora.
- Reenvíos escalonados del recordatorio (ej. día 1, día 7, día 15) — se
  decidió una sola notificación por simplicidad; se puede convertir en una
  fase 2 sin rediseñar nada de esto.
- Colas (`BullMQ`, ya instalado pero sin uso en el proyecto) — se usa
  `@nestjs/schedule` por ser suficiente para "una tarea diaria" sin
  agregar infraestructura (Redis-dependiente) que hoy nadie más usa.
- Adjuntar el boletín/PDF de pago en el correo — son correos de solo
  texto/HTML en esta versión.

## Opciones consideradas

**Proveedor de correo:**
1. **Resend (elegida).** Integración más simple en Nest, buena capa
   gratuita, plantillas HTML sencillas.
2. **Amazon SES.** Más barato a escala y natural si más adelante usan más
   de AWS, pero el setup inicial (verificación de dominio, sandbox mode,
   DKIM) es más largo. Descartado por ahora — se puede migrar después
   porque queda detrás de `EmailPort`, sin tocar el resto del sistema.

**Alcance de plantillas:**
1. **Editables por tenant desde el inicio (elegida).** Tabla
   `email_templates` dentro del schema de cada colegio, con placeholders,
   editable por `admin_institucion`/`directivo`. Evita tener que tocar
   código cada vez que un colegio pida cambiar la redacción.
2. **Texto fijo en código, editor como fase 2.** Plan más chico, pero
   descartada — el usuario prefirió pagar el costo de alcance ahora en vez
   de reabrir esta área después.

**Mecanismo de tarea recurrente:**
1. **`@nestjs/schedule` con `@Cron` (elegida).** Un cron diario simple,
   sin infraestructura nueva.
2. **BullMQ.** Ya está como dependencia pero sin ningún uso real en el
   código — se descartó para no construir infraestructura de colas desde
   cero solo para esto; queda como opción natural si en el futuro se
   necesitan reintentos/colas para otra cosa.

## Diseño

### 1. `EmailModule` (nuevo)

Mismo patrón hexagonal que `finance` usa para el gateway de pago
(`PaymentGatewayPort` / `payment-gateway.port.ts`):

```ts
// application/ports/email.port.ts
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export abstract class EmailPort {
  abstract send(input: SendEmailInput): Promise<void>;
}
```

```ts
// infrastructure/email/resend-email-gateway.ts
// Lee RESEND_API_KEY y RESEND_FROM_ADDRESS vía ConfigService (mismo
// patrón que las credenciales de MercadoPago/Wompi). Usa el SDK oficial
// de Resend.
export class ResendEmailGateway extends EmailPort {
  async send(input: SendEmailInput): Promise<void> { /* ... */ }
}
```

### 2. Plantillas por tenant

**Entidad + tabla `email_templates`** (dentro del schema de cada tenant,
migración normal como cualquier otra tabla del dominio):

```ts
export type EmailTemplateType =
  | 'solicitud_recibida'
  | 'pago_aprobado'
  | 'pago_rechazado'
  | 'solicitud_aceptada'
  | 'solicitud_rechazada'
  | 'recordatorio_pension';

export class EmailTemplate {
  constructor(
    public readonly id: string,
    public readonly type: EmailTemplateType,
    public subject: string,
    public body: string, // HTML con placeholders {{variable}}
    public updatedAt: string,
  ) {}
}
```

**`EmailTemplateService.render(type, variables)`**:
1. Busca en `EmailTemplateRepositoryPort.findByType(type)` (tenant
   actual).
2. Si no existe, usa el default hardcodeado en código para ese `type`
   (un mapa `DEFAULT_TEMPLATES: Record<EmailTemplateType, {subject,
   body}>` en el propio módulo).
3. Reemplaza cada `{{variable}}` en `subject`/`body` con el valor
   correspondiente de `variables` (reemplazo simple de texto, sin motor
   de plantillas externo — no hace falta para este volumen de variables).

**`SendTemplatedEmailUseCase.execute({type, to, variables})`**:
- Junta `render` + `EmailPort.send`.
- Mejor esfuerzo: `try/catch` + `Logger.warn`, mismo patrón que
  `NotifyNewGradeService` — un fallo de envío nunca debe tumbar el
  flujo que lo dispara (guardar la solicitud, confirmar el pago, etc.),
  porque esa acción ya se completó antes de intentar el correo.

**CRUD admin de plantillas:**
- `ListEmailTemplatesUseCase` (los 6 tipos, con su valor actual —
  personalizado o el default mostrado como tal), `UpdateEmailTemplateUseCase`.
- `EmailTemplatesController`, gateado a `admin_institucion`/`directivo`
  vía CASL (se agrega el subject `EmailTemplate` al `AbilityFactory`,
  mismo patrón que el resto de los subjects administrativos).
- Frontend: una pantalla simple (ej. dentro de "Configuración") con las 6
  plantillas, un editor de asunto/cuerpo por cada una, y la lista de
  placeholders disponibles para ese tipo (ej. para `recordatorio_pension`:
  `{{estudiante}}`, `{{monto}}`, `{{fechaVencimiento}}`).

### 3. Disparadores sobre el flujo de admisión

Se agregan llamadas a `SendTemplatedEmailUseCase` (inyectado, mismo
patrón que `NotifyNewGradeService` se inyectó en `RecordScoresUseCase`)
en los use-cases ya existentes, **después** de que la operación principal
ya se completó:

| Use-case existente | Momento | `type` | Variables |
|---|---|---|---|
| `create-admission-application.use-case.ts` | tras guardar la solicitud + generar el checkout | `solicitud_recibida` | `trackingCode`, `estudiante`, `grado`, `checkoutUrl` |
| `handle-admission-payment-webhook.use-case.ts` | tras `attempt.approve()` | `pago_aprobado` | `trackingCode`, `estudiante` |
| `handle-admission-payment-webhook.use-case.ts` | tras `attempt.reject()` | `pago_rechazado` | `trackingCode`, `estudiante` |
| `accept-admission-application.use-case.ts` | tras aceptar | `solicitud_aceptada` | `trackingCode`, `estudiante` |
| `reject-admission-application.use-case.ts` | tras rechazar | `solicitud_rechazada` | `trackingCode`, `estudiante` |

El destinatario en los cinco casos es `application.guardianEmail` — no
hay usuario de plataforma involucrado, así que `to` es el email crudo, no
un `recipientId`.

### 4. Recordatorio diario de pensión vencida

**Nueva tabla `pension_reminder_log`** (schema de cada tenant, aditiva —
no toca la entidad `Charge` existente):

```ts
export class PensionReminderLog {
  constructor(
    public readonly id: string,
    public readonly chargeId: string,
    public readonly sentAt: string,
  ) {}
}
```

**`SendPensionReminderTask`**, con `@Cron('0 8 * * *')` (8am todos los
días), en el módulo `finance` (o un módulo `notifications` si el plan
prefiere aislarlo — se confirma al escribir el plan):

1. Consulta `platform.tenants` (`SELECT schema_name FROM tenants`, mismo
   query que ya usa `run-migrations-all-tenants.ts`) para obtener la
   lista de colegios.
2. Por cada `schemaName`, corre el resto del trabajo dentro de
   `tenantAsyncStorage.run({ tenantId, schemaName, subdomain }, async () =>
   { ... })` — el mismo `AsyncLocalStorage` que
   `TenantResolutionMiddleware` publica en cada request HTTP
   (`apps/api/src/core/tenant/tenant-context.ts`), para poder reusar los
   repositorios/servicios existentes (`ChargeRepositoryPort`,
   `PaymentRepositoryPort`, `EnrollmentRepositoryPort`, etc.) sin
   duplicar lógica de acceso a datos.
3. Dentro de ese contexto, por tenant:
   - Trae cargos con `concept = 'pension'`, `voidedAt IS NULL`,
     `dueDate < hoy` (mismo criterio que `OverdueBalanceChecker`, pero
     acotado a `pension`).
   - Descarta los que ya tienen un `PensionReminderLog` (`findByChargeId`).
   - De los restantes, calcula saldo con `computeBalance` (mismo cómputo
     que `OverdueBalanceChecker`) y descarta los que ya están saldados.
   - Para cada cargo pendiente: busca el estudiante/acudientes de la
     matrícula (`GuardianAccessService.getGuardianIds`, ya existente) y
     llama `SendTemplatedEmailUseCase` con `type: 'recordatorio_pension'`
     a cada email real (`identity` ya tiene el email de cada usuario).
   - Guarda un `PensionReminderLog` por cada cargo procesado (se envíe o
     falle el correo — lo que se protege es "no reprocesar este cargo",
     no "reintentar hasta que el correo funcione"; si un envío puntual
     falla, se loguea como advertencia y sigue con el resto, igual que
     los demás flujos best-effort de este diseño).

### Configuración nueva

- `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` — variables de entorno nuevas,
  documentadas en `.env.example`.
- Dependencia nueva: SDK oficial de `resend` (paquete `resend` de npm).
- Dependencia nueva: `@nestjs/schedule`.

### Casos límite

- **Tenant sin ninguna plantilla personalizada:** usa el default de
  código para los 6 tipos — el sistema funciona sin que nadie configure
  nada.
- **Falla el envío de un correo puntual (Resend caído, email inválido):**
  se loguea como advertencia y el flujo que lo disparó (guardar solicitud,
  confirmar pago, etc.) no se ve afectado — ya se completó antes de
  intentar el correo.
- **Pensión vencida sin ningún acudiente aprobado:** se envía solo al
  estudiante (mismo comportamiento que `NotifyNewGradeService` cuando no
  hay guardianIds).
- **El cron corre y un tenant nuevo se dio de alta el mismo día sin
  cargos aún:** simplemente no encuentra cargos vencidos para ese
  schema, sin error.
- **Pago de una pensión vencida llega el mismo día que corre el cron,
  antes de las 8am:** el saldo ya es 0 al momento de la consulta, así que
  no se envía recordatorio ni se genera log — comportamiento correcto sin
  necesitar ningún caso especial.

## Testing

- `EmailTemplateService.render`: con plantilla personalizada, sin
  plantilla (usa default), con variables faltantes (queda el placeholder
  literal o se decide un comportamiento explícito al escribir el plan).
- `SendTemplatedEmailUseCase`: envío exitoso, `EmailPort.send` que falla
  (no debe propagar la excepción).
- Los 5 puntos de disparo en admisiones: mock de `SendTemplatedEmailUseCase`,
  verificar que se llama con el `type`/variables correctos en cada
  transición de estado, y que una falla del envío no rompe el use-case
  principal (mismo patrón de test que
  `record-scores.use-case.spec.ts` para notas nuevas).
- `SendPensionReminderTask`: cargo vencido sin log previo → envía y
  registra; cargo con log previo → no reenvía; cargo ya saldado → no
  envía; cargo de otro concepto (`matricula`) → ignorado; múltiples
  tenants → cada uno se procesa de forma aislada.
