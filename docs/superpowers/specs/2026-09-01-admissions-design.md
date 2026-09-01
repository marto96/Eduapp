# Módulo de Solicitudes de Admisión — Diseño

## Contexto y objetivo

Hoy, para incorporarse al colegio, una familia debe comprar un formulario
de solicitud físico y luego asistir a una entrevista con la institución;
recién después de eso el estudiante se matricula (flujo ya digitalizado
en el módulo `enrollment`). Ese embudo previo (solicitud + pago +
entrevista) vive fuera de la plataforma hoy — en papel o gestionado
manualmente.

El objetivo es digitalizarlo sin recargar a secretaría/dirección con
trabajo administrativo nuevo, ni dejar todo el peso en la familia
solicitante (que hoy tiene que ir presencialmente a comprar el
formulario). Un beneficio adicional: al aceptar una solicitud, sus datos
alimentan directamente el flujo de matrícula ya existente, evitando
volver a tipear todo.

## Alcance de la v1

Incluye: formulario público de solicitud, pago en línea de la cuota de
solicitud (varía por grado), registro manual de la entrevista (fecha +
notas + resultado), aceptación/rechazo, y enlace con el flujo de
matrícula existente — incluyendo el caso de un estudiante que ya fue
alumno del colegio y regresa.

Explícitamente fuera de alcance de la v1 (decisiones tomadas durante el
diseño, no vacíos a completar después sin avisar):

- **Agendamiento de entrevista por turnos** (self-service, con franjas
  horarias disponibles). Se descartó para v1 porque requeriría construir
  un sistema de reservas completo desde cero (el `Calendario`/`Event`
  existente no tiene noción de franjas ni evita doble-reserva); el
  registro manual (secretaría anota fecha/hora coordinada por teléfono o
  email, igual que hoy) ya resuelve "no recargar a nadie" porque
  reemplaza el papel/Excel actual. Un v2 con turnos queda como mejora
  futura si el registro manual resulta ser un cuello de botella real.
- **Notificaciones por email/SMS a la familia** (aceptado, rechazado,
  entrevista agendada). No existe ningún servicio de envío de correo en
  la plataforma hoy (se verificó explícitamente: no hay
  `nodemailer`/`MailerService`/proveedor alguno integrado). Agregar uno
  es una decisión de infraestructura aparte (elegir proveedor, manejar
  credenciales, plantillas). Para v1, la familia consulta el estado ella
  misma mediante un código de seguimiento (ver más abajo).

## Modelo de datos

### `AdmissionApplication` (entidad nueva, módulo `admissions`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `trackingCode` | string, único | Código corto (ej. `SOL-A8F3K2`) entregado a la familia al enviar la solicitud; único medio de consulta de estado sin cuenta ni email. |
| `studentFirstName` / `studentLastName` | string | Datos del aspirante. |
| `studentBirthDate` | date | |
| `studentDocumentType` | `DocumentType` (`RC`\|`TI`\|`CC`\|`CE`\|`PA`) | Mismo tipo ya definido en `identity`. |
| `studentDocumentNumber` | string | Clave para detectar "estudiante de regreso" (ver más abajo). |
| `gradeId` | uuid → `Grade` | Grado al que aspira. |
| `guardianName` / `guardianEmail` / `guardianPhone` | string | Contacto de quien solicita — el aspirante no es un `User` todavía. |
| `status` | `AdmissionStatus` | Ver máquina de estados. |
| `feeAmount` | number | Copiado del `FeeSchedule` vigente al momento de crear la solicitud (no recalculado después, por si cambia el precio). |
| `paidAt` | timestamp \| null | |
| `interviewDate` | timestamp \| null | Cargado manualmente por secretaría/dirección. |
| `interviewNotes` | text \| null | |
| `rejectionReason` | text \| null | |
| `matchedUserId` | uuid \| null → `User` | Si `studentDocumentNumber` coincide con un usuario existente al momento de aceptar: estudiante de regreso. |
| `resultingEnrollmentId` | uuid \| null → `Enrollment` | Matrícula generada al aceptar. |
| `createdAt` / `updatedAt` | timestamp | |

```
type AdmissionStatus = 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada';
```

### Máquina de estados

```
pendiente_pago ──(pago confirmado)──> pendiente_entrevista ──(staff acepta)──> aceptada
                                                             └─(staff rechaza)──> rechazada
```

No hay transición de vuelta a `pendiente_pago` ni de `aceptada`/`rechazada`
hacia otro estado — igual que `Enrollment`, un intento de reingreso
posterior es una solicitud **nueva**, no una reapertura de la vieja
(mismo criterio ya aplicado a matrículas retiradas: preserva el
historial).

### Reutilización de `FeeSchedule`

Se agrega `'solicitud_admision'` como nuevo valor de `ChargeConcept`
(usado hoy por `Charge` y `FeeSchedule`). Se usa **solo** como clave de
precio en `FeeSchedule` (`gradeId + academicYearId + concept →
amount`) — la solicitud de admisión no genera un `Charge` real (un
`Charge` requiere `enrollmentId`, y el aspirante todavía no tiene
matrícula), sino un pago independiente registrado directamente en
`AdmissionApplication`.

### Pago

Se reutiliza `PaymentGatewayPort` (abstracción ya existente sobre
MercadoPago, agnóstica de `Charge`) mediante un caso de uso nuevo y
público, `CreateAdmissionCheckoutUseCase`, que arma la preferencia de
pago con el `feeAmount` de la solicitud. Se necesita una entidad de
seguimiento propia del módulo, `AdmissionPaymentAttempt` (mismo rol que
`PaymentAttempt` en `finance`, pero enlazada a `admissionApplicationId`
en vez de `chargeId`), y un webhook propio (`POST
/admissions/webhooks/payment`) que, al confirmar el pago, marca
`paidAt` y avanza el estado a `pendiente_entrevista`. No se toca el
webhook ni las entidades de pago de `finance` — el módulo `admissions`
solo depende del puerto del gateway, no de las entidades internas de
`finance`.

## Flujos

### 1. Familia envía la solicitud (público, sin login)

`POST /admissions/applications` (`@Public()`): recibe datos del
aspirante + grado + contacto del acudiente. Crea la solicitud en
`pendiente_pago`, copia el `feeAmount` vigente para ese grado, genera
`trackingCode`, y devuelve `{ trackingCode, checkoutUrl }` (el checkout
se crea en el mismo paso, para que la familia pague de una vez).

### 2. Pago confirmado

El webhook de MercadoPago confirma el pago → `paidAt` se completa,
estado pasa a `pendiente_entrevista`.

### 3. Consulta de estado (público, sin login)

`GET /admissions/applications/status/:trackingCode` (`@Public()`):
devuelve el estado actual (sin exponer datos sensibles de otros
aspirantes — se busca únicamente por el código exacto, que actúa como
credencial de un solo uso).

### 4. Secretaría/dirección gestiona la solicitud (autenticado)

Panel nuevo dentro del dashboard, listando solicitudes por estado.
Acciones:

- **Registrar entrevista**: `PATCH /admissions/applications/:id/interview`
  — carga `interviewDate` + `interviewNotes` (no cambia el estado por sí
  solo; el resultado se registra con aceptar/rechazar). Es informativo,
  no un requisito bloqueante: aceptar/rechazar son válidos desde
  `pendiente_entrevista` haya o no una entrevista cargada todavía (cubre
  el caso de rechazar sin llegar a la instancia de entrevista, por
  ejemplo si el aspirante no cumple un requisito básico).
- **Aceptar**: `PATCH /admissions/applications/:id/accept`. Antes de
  nada, busca si `studentDocumentNumber` coincide con un `User`
  existente (mismo chequeo que ya usa `CreateUserUseCase` para evitar
  documentos duplicados):
  - **Sin coincidencia (aspirante nuevo)**: la respuesta incluye los
    datos del aspirante listos para pre-cargar el modal de "Estudiante
    nuevo" ya existente en Matrícula — **no se crea nada
    automáticamente**; secretaría revisa/completa y confirma desde ese
    formulario (permite, por ejemplo, asignar recién ahí la sección
    definitiva).
  - **Con coincidencia (estudiante de regreso)**: la respuesta incluye
    el `matchedUserId`; el flujo de Matrícula se abre directamente en
    modo "Estudiante existente" con ese estudiante preseleccionado —
    solo falta elegir año/sección. Al confirmar la matrícula ahí,
    aplica la misma validación de no-retroceso de grado que ya se
    definió para el flujo normal de matrícula.
  - En ambos casos, `resultingEnrollmentId` se completa cuando la
    matrícula efectivamente se crea (no antes) y el estado pasa a
    `aceptada`.
- **Rechazar**: `PATCH /admissions/applications/:id/reject` con
  `rejectionReason` obligatorio. Estado pasa a `rechazada`.

## Permisos (CASL)

Nuevo subject `'Admission'`. `admin_institucion`/`directivo` con
`manage` (igual que `Grade`/`Section`); `secretaria` con `manage`
también (es tarea administrativa diaria, mismo criterio ya aplicado a
`Finance`/`Document` para ese rol). Los endpoints públicos (`POST
/applications`, `GET /status/:trackingCode`, webhook de pago) usan
`@Public()` y no pasan por CASL en absoluto — el control de acceso ahí
es el `trackingCode`/la firma del webhook, no un rol.

## Seguridad (endpoints públicos)

Al ser rutas sin autenticación, son el punto de mayor exposición del
módulo. Se reutiliza exactamente la infraestructura de seguridad que ya
protege los otros endpoints públicos existentes (`POST /auth/login`,
webhook de pagos de `finance`), sin inventar nada nuevo:

- **Rate limiting reforzado.** Ya existe un `ThrottlerGuard` global (20
  req/min por IP) que corre antes que cualquier guard de auth. Igual que
  `/auth/login` lo endurece con `@Throttle({ default: { limit: 5, ttl:
  60_000 } })`, `POST /admissions/applications` y `GET
  /admissions/applications/status/:trackingCode` llevan su propio
  `@Throttle` más estricto que el global (propuesto: 5/min para crear
  solicitud, 10/min para consultar estado) — ambos son blancos directos
  de abuso (spam de solicitudes falsas, fuerza bruta de códigos).
- **`trackingCode` no adivinable.** Se genera con un generador
  criptográficamente aleatorio (no incremental, no basado en timestamp),
  con suficiente entropía para que ni sumando el throttling sea viable
  fuerza bruta. Nunca se expone en ningún listado — solo se devuelve una
  vez, en la respuesta de creación, a quien la creó.
- **Respuesta de estado minimalista.** `GET
  /admissions/applications/status/:trackingCode` devuelve únicamente
  `status` + `gradeName` + `createdAt` — **no** el documento, fecha de
  nacimiento, dirección ni contacto del acudiente completos, aunque el
  código sea correcto. Reduce el impacto si un código se filtra
  (capturas de pantalla compartidas, etc.). Un código inexistente
  devuelve 404 genérico, sin distinguir "no existe" de "formato
  inválido" (evita dar pistas para enumerar códigos válidos).
- **Firma de webhook obligatoria.** El webhook de pago de admisiones
  reutiliza `verifyMercadoPagoSignature` (la misma función ya usada por
  `PaymentWebhookController` en `finance`, importada directamente — no
  se duplica lógica de verificación). Ninguna solicitud pasa a
  `pendiente_entrevista` sin que la firma sea válida.
- **Validación estricta de payload.** DTOs con `class-validator` en
  cada campo (largo máximo de strings, formato de email/teléfono,
  `IsIn` para tipo de documento) — se apoya en la configuración global
  ya existente (`whitelist`, `forbidNonWhitelisted`, `transform` en
  `main.ts`), que ya rechaza cualquier campo no declarado en el DTO.
- **No duplicar solicitudes en curso.** `POST
  /admissions/applications` rechaza (409) si ya existe una solicitud en
  `pendiente_pago` o `pendiente_entrevista` con el mismo
  `studentDocumentNumber` — evita spam duplicado del mismo aspirante y
  confusión en el panel de staff (mismo criterio que ya usa
  `EnrollStudentUseCase` para no permitir dos matrículas activas del
  mismo estudiante).

## Frontend

- `/admisiones/solicitar` — formulario público (fuera del grupo de
  rutas `(dashboard)`, sin sidebar/header autenticado), redirige al
  checkout de MercadoPago al enviar.
- `/admisiones/estado` — página pública, input de `trackingCode`,
  muestra el estado actual en español.
- `/admissions` (dentro del dashboard) — listado para staff, con
  acciones de registrar entrevista / aceptar / rechazar. Aceptar navega
  a Matrícula con los datos de la solicitud pre-cargados (vía query
  param con el id de la solicitud, que la página de Matrícula usa para
  pedir los datos y abrir el modal correspondiente ya completado).

## Testing

Mismo patrón que el resto del código: tests unitarios de casos de uso
(`CreateAdmissionApplicationUseCase`, `AcceptAdmissionApplicationUseCase`
— incluyendo el caso de coincidencia por documento —,
`RejectAdmissionApplicationUseCase`) con repositorios mockeados; sin
tests de integración de MercadoPago real (se verifica manualmente,
mismo criterio que el checkout de cargos existente). Incluye
específicamente los casos de la sección de Seguridad: rechazo por
documento con solicitud ya en curso (409), y rechazo del webhook con
firma inválida/ausente (reutilizando el mismo test que ya existe para
`verifyMercadoPagoSignature`, no reescribiéndolo). Verificación manual
end-to-end en navegador antes de dar la feature por terminada,
incluyendo confirmar que el `@Throttle` reforzado efectivamente corta
tras el límite configurado.
