# Booking Sport — Documentación General del Sistema

Documento de referencia del proyecto **Booking Sport**: qué es el sistema, cómo está armado y cómo funcionan sus flujos principales.

> Última actualización: 2026-10-19

---

## 1. Visión General

**Booking Sport** es un SaaS multi-tenant para la gestión y reserva de espacios deportivos. Las empresas administran sus instalaciones y sucursales; los usuarios finales descubren y reservan canchas.

El modelo de negocio es una **suscripción mensual/anual** pagada por la empresa. La plataforma **no cobra comisión** por reserva.

### Proyectos del repositorio

| Carpeta | Qué es | Stack |
|---------|--------|-------|
| `BACKEND_APP/` | API REST — **el backend activo** | Node.js + Express + TypeScript + Sequelize + PostgreSQL + Redis |
| `ADMIN_APP/` | Panel de administración (empresa / sucursal) | React + Vite + TypeScript |
| `BACKEND_BOOKING/` | **Legacy** — backend viejo en JavaScript, sin mantener. No se despliega | Express (JS) |

> El portal público del cliente (`FRONTEND_BOOKING`) **todavía no existe**. El módulo `bookings` del backend tiene los modelos pero no está portado.

---

## 2. Arquitectura del Backend (`BACKEND_APP/`)

Node.js + Express + Sequelize (PostgreSQL) + Redis + Socket.io + MercadoPago.

### 2.1. Capas

Cada módulo sigue una **arquitectura de capas modular** con dirección de dependencia fija:

```
Request → routes/ → dto/ → controllers/ → service/ → repository/ → database/
```

| Capa | Responsabilidad |
|------|----------------|
| `routes/` | Método, path y middlewares. Sin lógica de negocio |
| `dto/` | Schema Joi (validación de entrada) + DTO de salida (qué se le expone al front) |
| `controllers/` | Lee el `req`, llama al service, formatea la respuesta con `ApiResponse` |
| `service/` | **Toda la lógica de negocio**: validaciones, scope, transacciones, caché |
| `repository/` | **Única capa** que habla con Sequelize / la base de datos |
| `interfaces/` | Contratos de payload del service (`RegisterXInput`, `UpdateXInput`, `ListXQuery`) |
| `database/` | Modelos, migraciones y seeders |

**→ La referencia completa de capas, sus reglas y el flujo de una request están en [`ARQUITECTURA_CAPAS.md`](./ARQUITECTURA_CAPAS.md).**

### 2.2. Módulos (`src/modules/`)

| Módulo | Responsabilidad |
|--------|-----------------|
| `auth/` | Login admin, emisión de JWT, recuperación de contraseña, `resolveAuthorization` |
| `users/` | Usuarios, roles, permisos por usuario, asignaciones a empresas/sucursales |
| `companys/` | Empresas, sucursales, espacios deportivos, configuración operativa, media |
| `system/` | Catálogos (país, ubigeo, deportes, superficies, pagos), roles, permisos, menú, media core |
| `saas/` | Planes, suscripciones, cobros y límites por plan |
| `notificacions/` | Notificaciones por email / WhatsApp, plantillas |
| `bookings/` | Reservas y pagos — **aún no portado** (solo modelos) |

### 2.3. Capas transversales (`src/shared/`)

| Carpeta | Contenido |
|---------|-----------|
| `shared/middlewares/` | `verificarTokenAuth`, `verificarPermiso`, `validateDTO`, `uploadMiddleware` |
| `shared/errors/` | `CustomErrors.ts` — `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError` |
| `shared/utils/` | `ApiResponse`, `accessScope`, `cacheUtility`, `createRouter`, `paginate`, `ids`, `roleHierarchy` |
| `shared/types/` | `auth.ts`, `pagination.ts`, ampliación de `Express.Request` |
| `shared/handlers/` | `GlobalErrorHandler` — traduce errores semánticos a JSON |

---

## 3. Modelo de datos

PostgreSQL, tablas con prefijo `dsg_bss_`.

### 3.1. Identidad y acceso

| Tabla | Qué es |
|-------|--------|
| `dsg_bss_user` | Usuarios (autenticación, datos básicos) |
| `dsg_bss_person` | Perfil demográfico del usuario |
| `dsg_bss_role` | Catálogo de roles con su `scope_level` |
| `dsg_bss_permissions` | Catálogo de permisos (`modulo.accion`) |
| `dsg_bss_user_permissions` | **Set efectivo de permisos por usuario** |
| `dsg_bss_role_permission` | Plantilla de permisos por rol — solo se copia al crear un usuario |
| `dsg_bss_user_company` | Asignación contextual usuario → empresa/sucursal |
| `dsg_bss_menu_items` / `dsg_bss_role_menu_item` | Menú del panel admin por rol |

### 3.2. Negocio

| Tabla | Qué es |
|-------|--------|
| `dsg_bss_company` | **Empresa y sucursal en la misma tabla**: `parent_company_id IS NULL` → empresa raíz; con valor → sucursal |
| `dsg_bss_space` | Espacios deportivos (pertenecen a una sucursal) |
| `dsg_bss_business_hour` | Horarios de operación por espacio |
| `dsg_bss_configuration` | Configuración operativa de la sucursal (redes, horarios, precio mínimo) |
| `dsg_bss_configuration_payment` | Métodos de pago activos por sucursal |
| `dsg_bss_payment_account` | Cuentas bancarias / Yape / QR por sucursal |
| `dsg_bss_ratings` | Reseñas de espacios |
| `dsg_bss_media` | Archivos (imágenes/videos) polimórficos por `medible_type` |

### 3.3. SaaS y plataforma

| Tabla | Qué es |
|-------|--------|
| `dsg_bss_saas_plans` | Planes disponibles |
| `dsg_bss_saas_subscriptions` | Suscripción de la empresa |
| `dsg_bss_saas_subscription_company` | Vínculo empresa ↔ suscripción |
| `dsg_bss_mercadopago_credential` | Credenciales de MercadoPago por empresa |
| `dsg_bss_country` / `dsg_bss_ubigeo` | Catálogos geográficos |
| `dsg_bss_sport_type` / `dsg_bss_sport_category` / `dsg_bss_surface_type` / `dsg_bss_payment_types` | Catálogos de dominio |

### 3.4. Multi-tenancy

La empresa raíz genera un `tenant_id` (UUID). Las sucursales **heredan** ese `tenant_id` (se duplica), así que todo el grupo comparte tenant sin necesidad de joins.

---

## 4. Control de acceso

El sistema separa **qué se puede hacer** de **hasta dónde se ve**.

### 4.1. El permiso habilita la acción

Los permisos efectivos salen de `dsg_bss_user_permissions` (set propio del usuario), resueltos **en caliente** en cada request — no viajan en el JWT, para que cambiar un permiso aplique de inmediato.

| Permiso | Significado |
|---------|-------------|
| `system.full_access` | Bypasea todos los chequeos. Exclusivo del rol `system` |
| `booking.*` | `create`, `view`, `confirm`, `cancel` |
| `payment.*` | `create`, `view`, `confirmed`, `refused`, `account_manage` |
| `company.*` | `view`, `create`, `edit` |
| `sucursal.*` | `view`, `create`, `edit`, `config`, `rating_manage` |
| `space.*` | `view`, `create`, `edit`, `business_hour_manage`, `media_manage` |
| `user.*` | `client_manage`, `employee_manage`, `administrator_manage`, `profile_edit` |
| `reports.view` / `statistics.view` | Reportes y estadísticas |

`dsg_bss_role_permission` es **solo la plantilla** que se copia al crear un usuario. Editarla no toca usuarios existentes.

### 4.2. El rol define el alcance

El `scope_level` del rol (`dsg_bss_role`) define hasta dónde ve el usuario. **Un permiso nunca amplía el alcance de datos.**

| Rol | `scope_level` | Alcance |
|-----|---------------|---------|
| `system` | 1 | Toda la plataforma |
| `super_admin` | 2 | Sus empresas raíz **+ todas sus sucursales** |
| `administrador` | 3 | Sus sucursales asignadas |
| `empleado` | 4 | Sus sucursales asignadas |
| `cliente` | `NULL` | Portal de reservas, sin scope admin |

Un `administrador` puede **escalar en acciones** (su `super_admin` le puede dar `company.edit`, `user.administrator_manage`…) pero sigue viendo **solo sus sucursales** en los listados.

---

## 5. Frontend (`ADMIN_APP/`)

React + Vite + TypeScript + React Router + Axios.

### 5.1. Estructura

```
ADMIN_APP/src/
├── modules/     → auth, bookings, companys, saas, system, users
│                  (pages / components / hooks / service / interfaces / styles)
├── shared/      → components, hooks, interfaces, store, styles, utils
└── App.tsx
```

### 5.2. Sesión y permisos

- `shared/store/sessionStore.ts` — única fuente de verdad del token, el usuario, sus permisos y sus `companyIds`. Persiste en `localStorage`.
- `shared/hooks/usePermission.ts` → `can('permiso')` — solo condiciona qué se renderiza. **La seguridad real la garantiza el backend.**
- Rutas protegidas con `ProtectedRoute`.

### 5.3. Sistema de diseño

Los tokens de color viven **solo** en `shared/styles/colors.css` y traen su valor por modo (claro/oscuro). Ningún componente define colores literales ni overrides `[data-theme="dark"]`. Ver la skill `ui-design`.

---

## 6. Flujos clave

### 6.1. Login y autorización

1. `POST /api/auth/login` con credenciales.
2. Se verifican contra `dsg_bss_user` (bcrypt) y se comprueba `is_enabled`.
3. Se emite el JWT con identidad básica.
   El JWT incluye `jti` y una sesión persistida en PostgreSQL; logout y recuperación de contraseña permiten revocarla.
4. En cada request, `resolveAuthorization` resuelve **en caliente** (con caché Redis invalidable, TTL 5 min) `role`, `permissions`, `company_ids` y `scope_level` desde la BD.
5. `verificarPermiso` valida el permiso de la acción.
6. El service valida el alcance (`assertCompanyScope`) contra `company_ids`.

> Los permisos **no** viajan en el JWT justamente para que un cambio de permiso aplique sin esperar a que el usuario renueve sesión.

### 6.2. Alta de empresa (wizard de 3 pasos)

`POST /api/companys/register` — payload anidado (`company` + `owner` + `plan`), todo en **una transacción**:

```
Company (empresa raíz, tenant_id nuevo)
  + User (dueño, rol super_admin) + Person
  + UserCompany (asignación del dueño)
  + SaaSSubscription (plan ACTIVE, gateway MANUAL)
```

Después el dueño puede abrir sucursales, espacios y asignar empleados/administradores.

### 6.3. Registro y edición de un espacio

```
POST /api/spaces/:sucursalPublicId        → alta (valida scope, catálogos y límite maxSpaces del plan)
PUT  /api/spaces/space/:spacePublicId      → edición (valida scope sobre la sucursal del espacio)
GET  /api/spaces/space/:spacePublicId      → detalle
```

El scope se valida siempre contra `space.sucursal_id` — el espacio no se puede mover de sucursal.

### 6.4. Notificaciones

`notificacions/` emite eventos (`COMPANY_REGISTERED`, `PASSWORD_CHANGED`…) por **email** (Nodemailer/Resend) y **WhatsApp**, con plantillas en `templates/`.

---

## 7. Infraestructura

| Servicio | Uso |
|----------|-----|
| **PostgreSQL** | Base de datos principal |
| **Redis** | Caché de autorización, catálogos y consultas recurrentes |
| **Socket.io** | Eventos en tiempo real (reservas) |
| **MercadoPago** | Cobro de suscripciones SaaS. La integración está construida y probada en sandbox, **deshabilitada hasta que la app esté en un servidor real** — ver `pendiente-integracion-pagos-mercadopago.md` |
| **Sentry** | Monitoreo de errores en producción |
| **Multer** | Subida de archivos (imágenes/videos) |

---

## 8. Convenciones del equipo

1. **No bypasear capas.** Nunca llamar a un Repository desde un Controller — siempre por el Service.
2. **Errores semánticos.** Lanzar siempre `CustomErrors` desde el service; nunca responder HTTP desde el service.
3. **Validación en el backend.** Todo input del front tiene su schema Joi (`validateDTO`).
4. **El front nunca ve ids internos.** Solo `public_id` (UUID).
5. **El scope lo decide el rol, el permiso habilita la acción.**
6. **Reutilizar antes de crear.** `shared/components`, `shared/hooks`, `shared/utils`.
7. **Un archivo por entidad en `interfaces/`** — es una hoja: no importa de models, services, repositories ni dto.
8. **Mensajes de Joi explícitos** — el usuario nunca ve el texto genérico de Joi.

---

## Documentos relacionados

| Documento | Qué cubre |
|-----------|-----------|
| [`ARQUITECTURA_CAPAS.md`](./ARQUITECTURA_CAPAS.md) | Capas del backend, reglas de cada una y flujo de una request |
| [`DIAGRAMA_RELACIONES.md`](./DIAGRAMA_RELACIONES.md) | Relaciones entre entidades de la base |
| [`DEPLOYE_GUIDE.md`](./DEPLOYE_GUIDE.md) | Guía de despliegue |
| [`pendiente-integracion-pagos-mercadopago.md`](./pendiente-integracion-pagos-mercadopago.md) | Estado de la integración con MercadoPago |
| [`correcciones-concurrencia-sesiones.md`](./correcciones-concurrencia-sesiones.md) | Migraciones, bloqueos concurrentes, sesiones revocables y despliegue |
