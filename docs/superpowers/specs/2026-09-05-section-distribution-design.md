# Reparto automático de estudiantes entre cursos — diseño

**Fecha:** 2026-09-05
**Estado:** Aprobado en conversación, pendiente de plan de implementación.

## Motivación

Cuando un grado se divide en varios cursos (ej. "Noveno" → 901/902 para 60
estudiantes), hoy el colegio arma la lista a mano, tratando de repartir
parejo por rendimiento académico y de no juntar a todos los estudiantes
"antiguos" (que ya venían del colegio) de un solo lado. Se pide una forma
automática de proponer ese reparto, dejando siempre la puerta abierta a
ajustar manualmente casos puntuales después.

## Alcance

- Repartir los estudiantes matriculados de **un grado, en un año lectivo**,
  entre **los cursos que el usuario elija** para ese grado (típicamente 2,
  pero no se asume una cantidad fija).
- Criterios de balance para esta primera versión: **promedio académico del
  año anterior**, **antigüedad** (viene matriculado de años anteriores vs.
  recién admitido), y **tamaño parejo** entre los cursos destino.
- El reparto se **aplica directamente** (no es una vista previa editable) —
  el ajuste posterior se hace con la reasignación manual de sección que ya
  existe hoy, estudiante por estudiante.
- Fuera de alcance para esta versión: balance por género (no existe ese dato
  en el sistema — se decidió no agregarlo todavía, ver "Opciones
  consideradas"), mantener hermanos juntos, excluir estudiantes puntuales de
  ser reasignados, y una vista previa aparte antes de aplicar.

## Opciones consideradas

**Algoritmo de reparto:**

1. **Zigzag por promedio (elegida).** Se ordena a todos los estudiantes del
   grado por promedio descendente y se reparten en zigzag entre los cursos
   destino (curso A recibe el 1º, B el 2º, B el 3º, A el 4º, ...). Balancea
   promedio y cantidad en una sola pasada, y es fácil de auditar/explicar
   ("se repartió en zigzag por promedio") si alguien pregunta por qué un
   estudiante puntual quedó en tal curso.
2. **Optimización por puntaje de balance (multi-criterio).** Un algoritmo
   greedy que en cada paso asigna al curso que más lo necesite, minimizando
   la diferencia entre cursos en varios criterios a la vez. Descartada por
   ahora: mucho más difícil de explicar por qué un estudiante específico
   terminó en cada curso — es una caja negra frente a un padre que pregunte.
3. **Reparto por franjas de promedio (top/medio/bajo).** Más robusto si hay
   grupos de promedio muy dispares, pero más lógica que la opción 1 sin
   ganar mucho a cambio en un colegio de este tamaño. Descartada por ahora,
   queda como camino de mejora futura si el zigzag resulta insuficiente.

**Balance por género:** se decidió dejarlo fuera de esta versión. Hoy no
existe ningún campo de género en el sistema (ni en `User`, ni en la
solicitud de admisión); agregarlo implica decidir dónde se captura y
completarlo retroactivamente para todos los estudiantes existentes antes de
que el criterio sirva de algo. Se puede sumar después como un cambio
aislado (un campo + un ajuste en el zigzag) sin perder nada de lo construido
acá.

## Diseño

### 1. Promedio anual del estudiante (nuevo)

No existe hoy ningún cálculo de "promedio general del año" — solo
`GradeCalculationService.computeSubjectPeriodGrade` (por materia+periodo) y
`computeAccumulatedGrade` (por materia, entre periodos), ambos ya
implementados en
`apps/api/src/modules/grading/domain/services/grade-calculation.service.ts`.

Nuevo servicio `StudentYearAverageService` (mismo módulo,
`grading/domain/services/` o `grading/application/services/` según se
confirme en el plan):

- Input: `enrollmentId` (las notas —`GradeScore`— están ligadas a
  `enrollmentId`, no a `studentId` directamente — ver
  `apps/api/src/modules/grading/domain/entities/grade-score.entity.ts`).
- Junta todos los `GradeScore` de esa matrícula, los agrupa por
  `evaluationId` → `subjectId`/`periodId`/`category` (via `Evaluation`,
  `apps/api/src/modules/grading/domain/entities/evaluation.entity.ts`).
- Corre `computeSubjectPeriodGrade` y `computeAccumulatedGrade` por materia
  (reuso de lo existente), y promedia el resultado entre todas las materias
  del estudiante → un solo número.
- Si la matrícula no tiene ningún `GradeScore` registrado, devuelve `null`
  ("sin promedio").

### 2. Antigüedad

Un estudiante es **antiguo** para el año objetivo si tiene alguna
`Enrollment` propia (cualquier estado salvo `withdrawn`) en un año lectivo
anterior al del reparto, en este colegio — se resuelve consultando
`enrollments` por `studentId` con un `academicYearId` de fecha de inicio
anterior a la del año objetivo (`AcademicYearRepositoryPort.findAll()` ya
expone `startDate` para esa comparación).

- Antiguo con promedio calculable → se usa ese promedio real (calculado
  sobre su matrícula del año anterior, no la del año que se está
  repartiendo — todavía no tiene notas ahí).
- Antiguo sin notas registradas, o estudiante nuevo (sin matrícula previa)
  → se le asigna el promedio **neutro**: la mediana de los promedios reales
  del grupo. Así ni se le favorece ni se le perjudica en el orden.

### 3. Caso de uso: `DistributeGradeIntoSectionsUseCase`

Nuevo, en `apps/api/src/modules/enrollment/application/use-cases/`.

**Input:** `gradeId`, `academicYearId`, `sectionIds: string[]` (2 o más,
todas deben pertenecer a `gradeId` — se valida contra
`SectionRepositoryPort`).

**Pasos:**
1. Valida que el grado y el año existan, y que todas las `sectionIds`
   pertenezcan a ese grado.
2. Reúne todas las `Enrollment` activas del grado+año (via las secciones de
   ese grado — `Enrollment` no guarda `gradeId` directamente, solo
   `sectionId`).
3. Para cada estudiante: calcula promedio (paso 1) y antigüedad (paso 2).
4. Calcula la mediana de los promedios reales del grupo (para los casos sin
   promedio).
5. Ordena a los estudiantes por promedio descendente (empates: se mantiene
   el orden estable de llegada, sin criterio adicional en esta versión).
6. Reparte en zigzag entre `sectionIds`, en el orden dado.
7. Para cada estudiante cuya sección calculada difiera de la actual,
   reasigna su matrícula (mismo mecanismo que ya usa
   `reassign-enrollment-section.use-case.ts` — mover sección dentro del
   mismo grado).
8. Devuelve un resumen por estudiante: sección anterior → sección nueva,
   promedio usado (real o mediana), antiguo/nuevo.

### 4. Ajuste manual posterior

No se construye nada nuevo — ya existe la reasignación individual de
sección (`reassign-enrollment-section.use-case.ts`). El reparto automático
sólo dispara muchas reasignaciones de una sola vez; después de aplicado,
cada estudiante se puede volver a mover individualmente sin restricción
especial. Si la lista de matrículas (`enrollments-list.tsx`) no tiene hoy un
control de reasignación por fila, se agrega ahí como parte de este mismo
trabajo (se confirma alcance exacto en el plan).

### 5. Disparo / UI

Un botón "Repartir automáticamente" en la pantalla de matrículas o
secciones (a definir el lugar exacto en el plan), que pide elegir el grado,
el año, y los cursos destino, y al aplicar muestra el resumen del punto 3.8
(sección anterior → nueva, promedio, antiguo/nuevo) para que el staff vea
qué se movió.

### Casos límite

- **Cantidad impar de estudiantes:** el zigzag lo maneja solo (un curso
  queda con uno más).
- **Repetir el reparto:** se puede correr de nuevo sin problema — recalcula
  todo desde cero y reasigna: es idempotente respecto al resultado final,
  aunque no respecto a los ajustes manuales hechos entre medio (una
  segunda corrida puede deshacer un ajuste manual previo — se documenta
  como comportamiento esperado, no se protege en esta versión).
- **Estudiante sin ninguna nota y sin matrícula previa (recién admitido,
  sin historial):** promedio neutro (mediana del grupo).
- **Menos de 2 cursos destino:** rechazado — el reparto no tiene sentido
  con un solo curso.

## Testing

- `StudentYearAverageService`: casos con notas completas, notas parciales,
  sin notas, una sola materia, varias materias.
- Algoritmo de zigzag (función pura, separada del caso de uso): cantidad
  par, impar, promedios todos iguales, mezcla de antiguos/nuevos, 2 cursos,
  3+ cursos.
- `DistributeGradeIntoSectionsUseCase`: grado/año/secciones inválidas,
  secciones que no pertenecen al grado, menos de 2 secciones, caso feliz
  completo con mocks de todos los puertos involucrados.
