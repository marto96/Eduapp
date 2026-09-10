# Perfil de autoservicio para usuarios de tenant — Diseño

## Contexto y objetivo

Ítem #4 del backlog reportado el 2026-09-10: hoy ningún usuario de un
tenant (`admin_institucion`, `directivo`, `secretaria`, `docente`,
`estudiante`, `padre_tutor`) puede subir una foto de perfil ni editar
sus propios datos básicos. El header del panel (`(dashboard)/layout.tsx`)
solo muestra iniciales generadas del nombre — no existe ningún concepto
de foto en el sistema.

**Objetivo:** que cualquier usuario autenticado pueda, desde una página
propia, ver y editar sus datos básicos (nombre, apellido, fecha de
nacimiento, tipo/número de documento, dirección, teléfono) y subir una
foto de perfil, sin poder tocar su email ni sus roles.

## Decisiones acordadas (de la conversación de brainstorming)

- **Email:** no editable desde este flujo. Sigue siendo un dato que
  solo un admin puede cambiar (vía el `PATCH /users/:id` ya existente)
  — evita el riesgo de que un usuario se equivoque y pierda acceso a
  su propia cuenta, sin agregar un flujo de re-verificación.
- **Roles:** no forman parte de este flujo bajo ningún concepto — la
  autoedición nunca debe poder escalar privilegios.
- **Campos editables:** nombre, apellido, fecha de nacimiento, tipo y
  número de documento, dirección (ya existen en `User`) — más
  **teléfono**, que es un campo nuevo (no existía).
- **Foto de perfil:** campo nuevo (`photo_url`), con el mismo mecanismo
  de subida que ya usa el logo del tenant (`FileStoragePort` /
  `LocalDiskFileStorage`), mismo límite de tamaño y tipos permitidos
  (png/jpeg/webp, 2MB).
- **Acceso desde la UI:** el nombre + círculo de iniciales que ya existe
  en el header del panel (hoy no hace nada al clickearlo) se convierte
  en un link a `/profile`. No se agrega un ítem nuevo al menú lateral.
- **Permisos:** siguiendo el mismo criterio que ya usa `GET /auth/me` y
  `POST /auth/logout` (los únicos endpoints "de uno mismo" que existen
  hoy en el código) — sin `@CheckPolicies`, el use-case toma el id del
  usuario directamente de `currentUser.sub`, nunca de un parámetro de
  ruta. En este código no existe ningún patrón de habilidad CASL
  condicionada a "uno mismo" (todas las reglas son solo rol×sujeto) —
  introducir una sería precedente arquitectónico nuevo e innecesario
  para este caso, que se resuelve más simple por construcción.
- **Auditoría:** corrección tras revisar el código (la suposición
  inicial era incorrecta) — el interceptor global de auditoría marca
  cualquier `POST`/`PATCH`/`PUT`/`DELETE` como escritura auditable
  salvo que tenga el decorador `@AuditSkip()` explícito, y `POST
  /auth/logout` no lo tiene, así que sí audita hoy (a diferencia de
  `GET /auth/me`, que no audita por ser una lectura sin
  `@AuditRead`). Se decide **no** agregar `@AuditSkip()` a los
  endpoints nuevos: que quede una entrada "el usuario X editó su
  propio perfil / subió una foto" es consistente con que toda otra
  escritura sobre `users` ya audita (incluida la edición que hace un
  admin), y no requiere código adicional.

## Arquitectura

### Backend

**Migración** `1700000000065-AddUserPhoneAndPhoto.ts` (schema de
tenant): agrega `phone TEXT NULL` y `photo_url TEXT NULL` a `users`.

**`User` (entidad de dominio)**
(`apps/api/src/modules/identity/domain/entities/user.entity.ts`):
suma los campos `phone: string | null` y `photoUrl: string | null` al
constructor, y un método nuevo `editProfile(input)` — **separado** del
`edit(input)` que ya usa `EditUserUseCase` (admin editando a otro
usuario, con roles y email incluidos) — que solo puede tocar
`firstName`, `lastName`, `birthDate`, `documentType`, `documentNumber`,
`address`, `phone`. Un método nuevo, no una reutilización del `edit()`
existente, para que sea estructuralmente imposible que la autoedición
toque `roles`/`email` por un error de copiar/pegar futuro.

**`EditMyProfileUseCase`**
(`apps/api/src/modules/identity/application/use-cases/edit-my-profile.use-case.ts`):
1. `execute(userId: string, input: EditMyProfileInput)` — `userId`
   viene siempre de `currentUser.sub` en el controller, nunca de la URL.
2. Busca el usuario por id → 404 si no existe (no debería pasar nunca
   en la práctica, pero mantiene el mismo criterio defensivo que el
   resto del código).
3. Si viene `documentNumber`, valida unicidad excluyéndose a sí mismo
   (mismo criterio que `EditUserUseCase`, incluyendo el fallback de
   `ConflictException` ante una carrera en la constraint de DB).
4. Si viene `birthDate`, valida que no sea una fecha futura.
5. Llama a `user.editProfile(input)` y persiste.

**`UploadMyProfilePhotoUseCase`**
(`apps/api/src/modules/identity/application/use-cases/upload-my-profile-photo.use-case.ts`):
1. `execute(userId: string, file: StoredFile)`.
2. Llama a `storage.save('user-photos', 'user-${userId}.${ext}', file, 'public')`
   (mismo `FileStoragePort` que ya usa el logo del tenant — sin
   infraestructura nueva).
3. Persiste la URL resultante en `user.photoUrl` y devuelve el usuario
   actualizado.

**Controlador** — ambos endpoints se agregan a
`AuthController` (`apps/api/src/modules/identity/interface/controllers/auth.controller.ts`),
junto al `GET /me` ya existente, porque es exactamente el mismo criterio
de autoservicio:
- `PATCH /auth/me` — sin `@CheckPolicies`, llama a
  `EditMyProfileUseCase.execute(currentUser.sub, dto)`.
- `POST /auth/me/photo` — `@UseInterceptors(FileInterceptor('photo', {...}))`
  con el mismo `fileFilter`/límite de tamaño que ya usa
  `update-tenant-logo.use-case.ts`, llama a
  `UploadMyProfilePhotoUseCase.execute(currentUser.sub, file)`.

**`GET /auth/me`** se extiende para devolver también `phone`,
`photoUrl`, `birthDate`, `documentType`, `documentNumber` y `address`
(hoy el endpoint no los incluye) — necesario para poder precargar el
formulario de edición. `AuthenticatedUser` (shared-types) se actualiza
en consecuencia.

**DTO** `EditMyProfileDto`
(`apps/api/src/modules/identity/interface/dtos/edit-my-profile.dto.ts`):
mismas validaciones de campo que ya usa `EditUserDto` para
`firstName`/`lastName`/`birthDate`/`documentType`/`documentNumber`/`address`,
más `phone?: string` (`@IsString`, opcional) — **sin** los campos
`email`/`roles` que sí tiene `EditUserDto`.

### Frontend

- `apps/web/src/app/(dashboard)/profile/page.tsx` — página nueva con el
  formulario de datos básicos + el selector/subida de foto.
- `apps/web/src/features/profile/use-profile.ts` — hook nuevo:
  `useMyProfile()` (lee el `/auth/me` extendido), `useEditMyProfile()`
  (mutation de `PATCH`), `useUploadMyProfilePhoto()` (mutation de
  `POST` con `FormData`).
- `apps/web/src/app/api/auth/me/route.ts` — se le agrega el handler
  `PATCH` (ya existe el `GET`).
- `apps/web/src/app/api/auth/me/photo/route.ts` — ruta nueva, reenvía
  el `multipart/form-data` tal cual al backend.
- `apps/web/src/app/(dashboard)/layout.tsx` — el bloque de
  nombre+iniciales pasa a estar envuelto en `<Link href="/profile">`;
  si `user.photoUrl` existe, se muestra la imagen en el círculo en vez
  de las iniciales (con las iniciales como `fallback` si la imagen no
  carga).

## No-objetivos (fuera de alcance de este spec)

- Editar email o roles desde este flujo — explícitamente excluido.
- Un ítem de menú lateral para el perfil — solo se accede desde el
  header.
- Verificación de foto/moderación de contenido — la subida es directa,
  igual que el logo del tenant hoy.
- Mostrar la foto del usuario en otras partes de la app (listas de
  usuarios, mensajería, etc.) — queda para un trabajo futuro si se pide.
- Historial de cambios de perfil dedicado (más allá del audit log
  general) — no se agrega ninguna vista nueva para esto.

## Testing

- **Backend:** unitarios para `EditMyProfileUseCase` (rechaza número de
  documento duplicado de otro usuario, rechaza fecha de nacimiento
  futura, el `userId` nunca puede alterar `email`/`roles` aunque el DTO
  los incluyera por error) y `UploadMyProfilePhotoUseCase` (rechaza
  tipo de archivo no permitido, rechaza archivo que excede el límite de
  tamaño, persiste la URL devuelta por el storage).
- **Frontend:** sin framework de test en `apps/web` (igual que el resto
  del frontend) — verificación manual en navegador: entrar con distintos
  roles (docente, estudiante, padre, admin), editar los datos básicos,
  subir una foto, confirmar que el header se actualiza con la foto
  nueva, y confirmar que un usuario sin foto sigue viendo sus iniciales.
