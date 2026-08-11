# Módulo: library

Catálogo de biblioteca y préstamos. Sigue el patrón Clean Architecture
estándar del proyecto (ver `identity` como referencia):

- `domain/entities`: `Book`, `Loan`.
- `application/ports` + `application/use-cases`: alta/listado de libros;
  alta/devolución/listado de préstamos (filtrado por rol: admin/directivo/
  secretaria ven todo, estudiante ve lo propio, padre_tutor ve lo de sus
  hijos aprobados).
- `infrastructure/entities` + `infrastructure/repositories`: TypeORM.
- `interface/controllers` + `interface/dtos`: `BooksController`,
  `LoansController`.

Sin integración al Portal de padres todavía (queda como pendiente
siguiente, igual que Documentos→PDF).
