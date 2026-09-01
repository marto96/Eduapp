# Manual de usuario — Skolaria

Guía de uso de la plataforma por rol. Cada institución (tenant) tiene su
propia URL/subdominio; los usuarios inician sesión con email y contraseña
dentro de esa institución.

## Índice

- [Ingreso a la plataforma](#ingreso-a-la-plataforma)
- [Conceptos generales](#conceptos-generales)
- [Administrador de institución](#administrador-de-institución-admin_institucion)
- [Directivo](#directivo)
- [Secretaría](#secretaría)
- [Docente](#docente)
- [Estudiante](#estudiante)
- [Padre/Tutor](#padretutor)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Ingreso a la plataforma

1. Entrá a la URL de tu institución.
2. Ingresá tu **email** y **contraseña**.
3. Si tu sesión expira, la plataforma te redirige automáticamente a esta
   pantalla — volvé a ingresar tus credenciales.
4. Podés cambiar entre tema claro/oscuro con el botón ☀️/🌙 en la esquina
   superior de la barra lateral.
5. Para salir, usá **"Cerrar sesión"** al pie de la barra lateral.

Cada rol ve un menú lateral distinto: solo aparecen las secciones a las
que tenés acceso.

---

## Conceptos generales

| Concepto | Qué es |
|---|---|
| **Año lectivo** | Un ciclo escolar (ej. "2026"). Todo lo académico (horarios, matrícula, calificaciones) está agrupado por año lectivo. |
| **Grado** | Un nivel educativo (ej. "1er grado"). |
| **Sección** | Un curso/paralelo dentro de un grado (ej. "Sección A"). Los estudiantes se matriculan en una sección, no en un grado directamente. |
| **Matrícula (enrollment)** | El vínculo entre un estudiante y una sección para un año lectivo. Puede estar **activa**, **completada** o **dada de baja**. |
| **Horario (schedule)** | Un bloque semanal recurrente: qué asignatura dicta qué docente, en qué sección, qué día y a qué hora. No es una clase de una fecha puntual — se repite todas las semanas mientras el año lectivo esté vigente. |
| **Clase virtual** | Un horario puede marcarse como "Clase virtual": genera un botón "Unirse" que abre una videollamada (Jitsi Meet) para esa clase. Se puede cancelar la clase de un día puntual sin afectar el resto de las semanas. |
| **Cargo (charge)** | Un monto a cobrar a un estudiante: matrícula, pensión u otro concepto, con fecha de vencimiento. |
| **Padre/tutor vinculado** | Un usuario con rol "padre_tutor" solo ve la información (asistencia, notas, finanzas) de los estudiantes a los que está vinculado — nunca la de toda la institución. |

---

## Administrador de institución (`admin_institucion`)

Acceso completo a todos los módulos de la institución. Es el único rol
que puede, además, gestionar la configuración general.

### Menú disponible
Panel · Años lectivos · Grados · Secciones · Asignaturas · Horarios ·
Matrícula · Asistencia · Calificaciones · Finanzas · RRHH · Documentos ·
Usuarios · Comunicados · Calendario · Mensajes · Encuestas · Biblioteca ·
Reportes

### Tareas habituales

**Configurar la estructura académica** (antes de empezar el año):
1. `Años lectivos` → crear el año con su fecha de inicio y fin.
2. `Grados` → crear cada grado (nombre + nivel).
3. `Secciones` → elegir un grado y crear sus secciones (ej. "A", "B").
4. `Asignaturas` → crear las materias que se dictan (nombre + área).

**Crear usuarios y asignar roles** (`Usuarios`):
1. Completá nombre, apellido, email, contraseña y elegí el rol.
2. Un mismo email no puede repetirse entre roles distintos.
3. **Vincular padre/tutor a estudiante**: al pie de la página, elegí el
   padre/tutor y el estudiante y confirmá el vínculo — desde ese momento
   el padre/tutor ve la información de ese estudiante en su portal.
4. **Resetear contraseña**: por si un usuario la olvidó.

**Armar los horarios** (`Horarios`):
1. Elegí año lectivo, sección, asignatura, docente, día y horario de
   inicio/fin.
2. Marcá **"Clase virtual"** si esa clase se dicta por videollamada — se
   habilita un botón "Unirse" para el docente y los estudiantes de esa
   sección, visible únicamente el día que corresponde.
3. La plataforma no permite superponer horarios: ni que un docente tenga
   dos clases al mismo tiempo, ni que una sección tenga dos asignaturas
   en el mismo bloque.
4. Alterná entre **"Vista lista"** y **"Vista por curso"** (grilla
   semanal por sección) según prefieras.

**Matricular estudiantes** (`Matrícula`):
1. Elegí un estudiante existente o cargá uno nuevo.
2. Elegí año lectivo y sección, y confirmá.
3. Una matrícula activa se puede **"Completar"** (fin de año, aprueba) o
   **"Dar de baja"** (el estudiante deja la institución).
4. Un estudiante no puede tener dos matrículas activas en el mismo año.

**Cargar cargos y cobrar** (`Finanzas` → pestaña "Cargos"):
1. Elegí el estudiante (por su matrícula), el concepto (matrícula,
   pensión, otro), el monto y el vencimiento. Podés aplicar una
   beca/descuento.
2. No se puede cargar dos veces la matrícula de la misma inscripción, ni
   dos pensiones para el mismo mes.
3. **"Lista de precios"** (pestaña): configurá de antemano el valor de
   matrícula/pensión por grado y año lectivo — al crear un cargo para un
   estudiante de ese grado, el monto se precarga automáticamente (y
   sigue siendo editable para casos puntuales).
4. **"Conciliación bancaria"** (pestaña): para cruzar pagos recibidos por
   transferencia contra los cargos pendientes.
5. Sobre cada cargo: **"Registrar pago"**, **"Editar"** o **"Anular"**.

**Tomar asistencia y cargar notas** — ver las secciones de Docente más
abajo; el admin ve y puede cargar lo mismo para cualquier sección.

**RRHH** (`RRHH`): crear el legajo de cada empleado (cargo, tipo de
contrato, fecha de ingreso, salario) y registrar licencias.

**Comunicación**: `Comunicados` (circulares institucionales o por
sección), `Calendario` (eventos, con vista lista/tabla/mes y un enlace
de suscripción para Google/Apple Calendar), `Mensajes` (chat 1 a 1),
`Encuestas` (crear encuestas de opción múltiple con fecha de cierre).

**Documentos**: emitir constancias de matrícula, certificados de notas,
etc. por estudiante.

**Biblioteca**: catálogo de libros y préstamos a estudiantes.

**Reportes**: matrícula, asistencia, finanzas y boletines consolidados
de toda la institución.

---

## Directivo

Tiene exactamente el mismo acceso que el administrador de institución
(los mismos módulos, las mismas acciones) — es el segundo nivel de
gestión completa. Seguí las instrucciones de la sección de
**Administrador de institución** de arriba.

---

## Secretaría

Rol administrativo diario: matrícula, finanzas, RRHH, documentos,
comunicación y biblioteca — sin acceso a la configuración académica
(años/grados/secciones/asignaturas), a la creación de horarios, a
asistencia/calificaciones, ni a la gestión de usuarios o reportes
institucionales.

### Menú disponible
Panel · Horarios (solo lectura) · Matrícula (solo lectura) · Finanzas ·
RRHH · Documentos · Comunicados · Calendario · Mensajes · Encuestas ·
Biblioteca

### Tareas habituales
Las mismas que el administrador para **Finanzas**, **RRHH**,
**Documentos**, **Comunicados**, **Calendario**, **Encuestas** y
**Biblioteca** (ver la sección de Administrador). En **Horarios** y
**Matrícula** solo puede consultar, no crear ni editar.

---

## Docente

Ve únicamente sus propias clases y las secciones donde dicta materia.

### Menú disponible
Panel · Horarios (solo las suyas) · Matrícula (solo lectura) ·
Asistencia · Calificaciones · Comunicados · Calendario · Mensajes ·
Encuestas · Biblioteca · Reportes (solo boletines de sus secciones)

### Tareas habituales

**Ver mi horario y dar clase virtual** (`Horarios`):
1. Vas a ver solo los bloques donde vos sos el docente asignado.
2. Si un horario tuyo está marcado como "Clase virtual", el día que
   corresponde vas a ver un botón **"Unirse"** (abre la videollamada) y
   **"Cancelar clase de hoy"** (por si no vas a dictarla ese día
   puntual — pedí un motivo opcional; no afecta las demás semanas).
3. Si ya cancelaste la clase de hoy, el botón cambia a **"Cancelada"**
   con un botón **"Revertir"** por si te equivocaste.

**Tomar asistencia** (`Asistencia`):
1. Elegí año lectivo, sección y fecha.
2. Marcá presente/ausente para cada estudiante de la sección y guardá.

**Cargar evaluaciones y notas** (`Calificaciones`):
1. `Crear evaluación`: elegí sección, asignatura, período (ej.
   "Trimestre 1"), tipo (examen/tarea/proyecto/otro) y nota máxima.
2. `Cargar notas`: elegí la evaluación y cargá la nota de cada
   estudiante de esa sección.

**Comunicación y biblioteca**: mismo uso que el resto de los roles (ver
Comunicados/Calendario/Mensajes/Encuestas/Biblioteca en la sección de
Administrador).

**Reportes**: acceso únicamente a los boletines de notas de sus propias
secciones.

---

## Estudiante

Acceso de solo lectura a su propia información académica — nunca a la
de otros estudiantes.

### Menú disponible
Panel · Mis datos (`/portal`) · Comunicados · Calendario · Mensajes ·
Encuestas · Biblioteca

### Qué ve en "Mis datos"
Por cada matrícula (año lectivo en el que estuvo o está inscripto):
sección, estado, asistencia, notas, cargos/finanzas, documentos
emitidos y préstamos de biblioteca a su nombre.

> **Nota:** hoy el menú del estudiante no incluye un enlace directo a
> "Horarios", así que no tiene una forma evidente de ver su horario de
> clases ni el botón "Unirse" a una clase virtual desde la navegación.
> Si tu institución usa clases virtuales, avisale al estudiante que la
> vía de acceso es a través del docente/institución hasta que se
> agregue ese enlace.

**Comunicación**: puede leer comunicados institucionales/de su sección,
ver el calendario, enviar y recibir mensajes, y responder encuestas
publicadas.

---

## Padre/Tutor

Igual que el rol Estudiante, pero ve la información de **cada
estudiante al que está vinculado** (un padre/tutor puede tener más de
un hijo/a vinculado). El vínculo lo crea un administrador o directivo
desde `Usuarios` → "Vincular padre/tutor a estudiante".

### Menú disponible
Panel · Mis datos (`/portal`) · Comunicados · Calendario · Mensajes ·
Encuestas · Biblioteca

Mismo uso que la sección de **Estudiante** de arriba, mostrando los
datos de cada hijo/a vinculado por separado.

---

## Preguntas frecuentes

**¿Por qué no veo un módulo que debería tener?**
Revisá con un administrador o directivo que tu usuario tenga el rol
correcto asignado (`Usuarios`, columna de rol).

**¿Qué hago si me quedé sin sesión de repente?**
La sesión expira por seguridad después de un tiempo de inactividad. Es
normal — volvé a ingresar tu email y contraseña.

**¿Cómo cambio mi contraseña?**
Pedile a un administrador o directivo que la resetee desde `Usuarios` →
"Resetear contraseña", y te va a dar una contraseña temporal para tu
próximo ingreso.

**¿Puedo tener más de un rol?**
Cada usuario (email) tiene un conjunto de roles fijo asignado al
crearlo. Si necesitás otro rol, pedile a un administrador que te cree
un usuario adicional con ese rol, o que ajuste el existente.

**¿Las clases virtuales usan alguna app que hay que instalar?**
No — se abren directamente en el navegador (Jitsi Meet), sin necesidad
de instalar nada ni crear una cuenta aparte.
