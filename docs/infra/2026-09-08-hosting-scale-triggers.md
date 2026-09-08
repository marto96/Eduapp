# Infraestructura de hosting — plan de escalado

**Fecha:** 2026-09-08
**Estado:** Decisión vigente para la etapa de demo. Revisar solo cuando se cumpla alguno de los disparadores de abajo — no antes.

## Decisión actual

Demo (hasta conseguir el primer cliente pagando) corre completo en **Railway**:
`apps/web` (Next.js) + `apps/api` (NestJS) + Postgres + Redis, los 4 como
servicios de un mismo proyecto. Dominio propio con DNS wildcard
(`*.dominio.com`) para el multi-tenant por subdominio.

**Por qué:** un solo dashboard, un solo bill, sin fricción de deploy, costo
esperado ~$5/mes o menos con tráfico de demo. Contexto completo de la
comparación con Vercel/Render/Fly.io: ver la conversación del
2026-09-08 (no hay spec separado, fue una decisión de spike).

## Disparadores para revisar esta decisión

No revisar por intuición ("ya deberíamos ser más grandes") — revisar cuando
pase alguna de estas cosas, concretamente:

1. **Primer cliente pagando confirmado.** Deja de ser demo — a partir de acá
   hay datos reales de estudiantes de un colegio real, y las decisiones de
   backup/compliance dejan de ser teóricas.
2. **Más de un tenant activo simultáneo con uso real** (no solo el propio
   equipo probando). La factura de Railway pasa a ser usage-based real, no
   estimada.
3. **La factura mensual de Railway supera ~$25-30/mes** de forma sostenida
   (no un pico puntual). A partir de ahí, un proveedor con capacidad
   reservada empieza a salir más barato por unidad.
4. **Un cliente pregunta explícitamente por SLA, backups con point-in-time
   recovery, o dónde físicamente viven los datos** (típico en instituciones
   educativas por regulación local de datos de menores). Railway no ofrece
   garantías formales de esto en los planes bajos.
5. **Un incidente de caída afecta a un cliente real** durante horario de
   uso (ej. un colegio cargando notas y el sistema no responde).
6. **Se necesita servir colegios en más de una región/país** con latencia
   como preocupación real, no hipotética.

## Qué evaluar en ese momento (no antes)

Cuando se cumpla alguno de los disparadores, evaluar por separado — no es
"migrar todo a la vez":

- **Base de datos:** mover Postgres a un proveedor dedicado con backups
  point-in-time y réplicas de lectura (Neon, Supabase, o RDS si ya se está
  en AWS por otro motivo). Es la pieza más urgente de las tres si el
  disparador fue "datos reales de estudiantes" o "pregunta de compliance".
- **Cómputo (`apps/web` + `apps/api`):** si el costo por uso ya no
  conviene, mover a capacidad reservada (Fly.io, un VPS, o AWS/GCP). Si lo
  que falta es latencia multi-región, ahí sí importa el proveedor con más
  regiones.
- **CDN / edge para `apps/web`:** si Next.js empieza a necesitar ISR
  distribuido o image optimization a escala, ahí Vercel específicamente
  vuelve a ser competitivo frente a Railway — reconsiderar mover solo el
  frontend, dejando el resto donde esté.
- **Seguridad de borde:** agregar Cloudflare delante (WAF, DDoS) antes de
  manejar datos reales de menores en producción, independientemente de
  dónde termine corriendo el backend.

## Cómo migrar sin cortes

Nada de lo elegido está atado a Railway específicamente — Postgres y Redis
son estándar, no versiones propietarias del proveedor. Eso hace que migrar
sea portable, no un salto al vacío.

- **Cómputo (`apps/web` + `apps/api`):** casi sin corte, porque la
  autenticación es JWT sin sesión guardada en el servidor — no hay
  "sticky sessions" que perder. Camino: desplegar el mismo código en el
  proveedor nuevo en paralelo (apuntando a la misma base de datos),
  probarlo en un subdominio propio, y recién ahí mover el DNS. Una
  request que caiga en el server viejo o el nuevo se comporta igual.
- **Base de datos:** con el volumen de datos esperable en esta etapa
  (pocos colegios, pocos meses de uso), un dump/restore en una ventana
  programada fuera de horario escolar (10-30 min, avisado con
  anticipación) es razonable y de bajo riesgo. Si para ese momento ya hay
  varios colegios y una ventana no es aceptable, Postgres soporta
  replicación lógica nativa: se levanta la base nueva como réplica de la
  vieja, se deja sincronizar, y el corte real queda reducido a los
  segundos que tarda cambiar `DATABASE_URL` y confirmar que no quedaron
  escrituras pendientes.
- **CDN/edge:** cambio a nivel DNS/proxy, de bajo riesgo — se puede
  probar antes de promoverlo (Cloudflare en modo "solo DNS" primero, o un
  deploy de preview en Vercel antes de apuntar el dominio real).

## Explícitamente fuera de alcance por ahora

- No migrar nada preventivamente "por las dudas" antes de que un
  disparador real se cumpla — el costo de over-engineering ahora es mayor
  que el de migrar más tarde con más información.
- No comprometerse con un proveedor "definitivo" hoy — la decisión de
  Railway es para la etapa de demo, no una apuesta a largo plazo.
