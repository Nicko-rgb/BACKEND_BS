# Arquitectura por capas — BACKEND_APP

> Capas obligatorias de cada módulo y flujo de una request de punta a punta.
> Última actualización: 2026-10-19

---

## Principio

Cada módulo (`src/modules/<modulo>/`) es una **unidad autonomous** que expone endpoints HTTP y guarda sus datos. Dentro de un módulo, el trabajo se reparte en capas con **una responsabilidad cada una** y una **dirección de dependencia fija**: las capas de arriba dependen de las de abajo, nunca al revés.

```
Request
   ↓
routes/          ← capa HTTP: método, path, middlewares. Sin lógica.
   ↓
dto/             ← capa de contrato de ENTRADA: schema Joi (runtime) + DTO de salida
   ↓
controllers/     ← capa HTTP: lee req, llama al service, formatea respuesta
   ↓
service/         ← capa de NEGOCIO: reglas, validaciones de dominio, transacciones, caché
   ↓
repository/      ← capa de DATOS: único acceso a Sequelize/BD
   ↓
database/        ← capa de PERSISTENCIA: modelos, migraciones, seeders
```

Las capas transversales (interfaces, utils, constants) cuelgan de los costados sin romper el flujo.

---

## Las capas y su propósito

### `routes/` — Capa HTTP

**Qué hace:** declara el método y el path, encadena los middlewares y delega en el controller.

**Regla que cumple:** *ninguna lógica de negocio*. Una route solo dice "este endpoint pide permiso X y usa el schema Y".

```ts
// companys/routes/space.route.ts
router.put('/space/:spacePublicId',
    resolveAuthorization,                 // auth + resuelve rol/permisos/company_ids en caliente
    verificarPermiso('space.edit'),       // el usuario tiene el permiso
    validateDTO(updateSpaceSchema),       // el body cumple el contrato
    updateSpace                           // → controllers/space.controller.ts
);
```

**Empieza:** el request entra por acá.
**Termina:** en el controller, pasando por todos los middlewares.

**Reglas:**
- Se usa `createRouter()` (no `Router()`): envuelve cada handler en `asyncHandler` y evita que una promesa rechazada cuelgue el request.
- Los middlewares van **en este orden**: `resolveAuthorization` → `verificarPermiso` → `validateDTO` → handler.
- El path expone **solo `public_id` (UUID)**, nunca `company_id`/`space_id` internos.

---

### `dto/` — Contratos de entrada y salida

**Qué hace:** dos cosas separadas en el mismo archivo o en dos:
- `*.schema.ts` — **schema Joi**: valida y normaliza el body/query en runtime.
- `*.dto.ts` — **forma de salida**: qué campos exactos se exponen al front.

**Regla que cumple:** *el front nunca ve un modelo de BD*. El DTO decide qué se filtra.

```ts
// dto/space.dto.ts — de salida
export const toSpaceDto = (space: Space) => ({
    publicId: space.public_id,        // sí
    name: space.name,
    // space_id NO se expone — el front nunca ve PKs internos
});
```

**Empieza:** el schema (antes del controller), valida `req.body` → `req.validatedData`.
**Termina:** el DTO, después del service, arma el JSON que sale.

**Reglas:**
- Todo schema tiene **mensajes de error explícitos** por campo (nunca el texto genérico de Joi).
- `stripUnknown: true` (en `validateDTO`) — los campos no declarados se descartan.
- Todo DTO expone `publicId` y jamás ids internos ni `tenant_id`.

---

### `controllers/` — Traducción HTTP ↔ dominio

**Qué hace:** extrae lo que necesita del `req`, llama al service y envuelve el resultado con `ApiResponse`.

**Regla que cumple:** *el controller no sabe reglas de negocio*. No valida catálogos, no chequea scope, no arma queries.

```ts
// controllers/space.controller.ts
export const spaceById = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const space = await SpaceService.spaceById(spacePublicId, req.user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Espacio deportivo obtenido exitosamente');
};
```

**Empieza:** con la request validada.
**Termina:** con la respuesta HTTP.

**Reglas:**
- Una función por endpoint, sin lógica condicional de negocio.
- Delega el formateo al DTO de salida.
- Los errores **no se try/catch** — se propagan al `GlobalErrorHandler`.

---

### `service/` — Reglas de negocio

**Qué hace:** todo lo que decide. Validaciones de dominio, scope, catálogos, límites de plan, transacciones, caché, orquestación de varios repositories.

**Regla que cumple:** *las reglas de negocio viven en un solo lugar* y son reutilizables desde cualquier entrypoint (HTTP, job, webhook).

```ts
// service/space.service.ts
export const register = async (sucursalPublicId: string, data: RegisterSpaceInput, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertCompanyScope(user, sucursal.company_id, 'No tenés acceso a esta sucursal');   // ← regla de alcance
    // ... validaciones de catálogos, plan limits, defaults
    return SpaceRepository.create({ /* ... */ });
};
```

**Empieza:** con datos ya validados por el schema.
**Termina:** cuando la entidad está persistida y devuelta.

**Reglas:**
- Lanza **errores semánticos** (`NotFoundError`, `ForbiddenError`, `BadRequestError`…), nunca strings sueltos.
- **No toca Sequelize.** Va siempre por `Repository`.
- Declara sus payloads como `interface` en `interfaces/` (ver abajo), no acá.
- Si toca más de una tabla → transacción (`sequelize.transaction`).

---

### `interfaces/` — Contratos de payload

**Qué hace:** declara la **forma** de los datos que entran al service: `RegisterXInput`, `UpdateXInput`, `ListXQuery`.

**Regla que cumple:** *la frontera `any` deja de ser `any`*. `req.validatedData` es `any` (cada ruta tiene su shape); la interface es donde ese `any` se vuelve un tipo concreto y verificable.

**Empieza:** antes de la firma del service.
**Termina:** en la firma del service — de ahí en adelante los datos están tipados.

```ts
// interfaces/space.interface.ts
export interface RegisterSpaceInput { name: string; /* ... */ }
export type UpdateSpaceInput = Partial<RegisterSpaceInput>;
```

**Reglas:**
- **Una interface por entidad, un archivo por entidad** (`space.interface.ts`, `company.interface.ts`…).
- Un archivo puede mezclar `interface` y `type` — el nombre describe el **ámbito** (contratos de la entidad), no la keyword.
- **No importa de `database/models/`, `service/`, `repository/` ni `dto/`.** Es una hoja: solo depende de `shared/types/` y de otras `interfaces/`.
- Un type que solo usa su propio módulo se queda en el modelo; **lo que se mueve acá es lo que consume otro archivo**.

---

### `repository/` — Acceso a datos

**Qué hace:** única capa que habla con Sequelize. Traduce queries y entidades a filas.

**Regla que cumple:** *el SQL (o su equivalente) está en un solo lugar*. Si el service escribiera queries, cada endpoint duplicaría la forma de filtrar.

```ts
// repository/space.repository.ts
export const getSpaceIdByPublicId = async (publicId: string): Promise<number | null> => {
    const row = await Space.findOne({ where: { public_id: publicId }, attributes: ['space_id'], raw: true });
    return row?.space_id ?? null;
};
```

**Empieza:** con los ids internos ya resueltos.
**Termina:** en la base de datos.

**Reglas:**
- **Una función = una query.** Sin lógica de negocio ni validaciones de dominio.
- Resuelve `public_id → id` cuando hace falta, para que el resto del flujo trabaje con PK indexados.
- Devuelve entidades del modelo o datos planos, nunca DTOs de salida.

---

### `database/` — Persistencia

**Qué hace:** define el mapeo de las tablas.

**Regla que cumple:** *el modelo es la fuente de la forma de la tabla*. Cambiar la DB = cambiar el modelo + migración, nunca el service.

```
database/
├── models/       → Sequelize: tabla, columnas, tipos, associations
├── migrations/   → cambios de schema (versionados, reproducibles)
└── seeders/      → datos iniciales (roles, catálogos, usuarios base)
```

**Reglas:**
- Los `ENUM` de la DB son `VARCHAR` cuando el valor se agrega sin migración — el type de TS y el schema Joi son la fuente de verdad de los valores válidos.
- Las **associaciones** entre modelos se wirean desde el `index.ts` del módulo, no desde el service.
- Un modelo **consume** los types de `interfaces/`, nunca al revés.

---

### `utils/` y `constants/` — Transversales del módulo

**Qué hace:** helpers sin estado y valores constantes del dominio del módulo.

**Regla que cumple:** *no duplicar el mismo helper en dos módulos*.

**Reglas:**
- `utils/` → funciones puras o helpers sin estado (`system/utils/permissionUsage.ts`, `saas/utils/planLimits.ts`).
- `constants/` → valores fijos del dominio (`system/constants/assignablePermissions.ts`, `notificacions/constants/notificationEvents.ts`).
- Lo que sea **compartido entre módulos** vive en `src/shared/`, no acá.

---

## Capas transversales de `src/shared/`

Son de **todos** los módulos, no de uno.

| Carpeta | Contenido | Regla |
|---------|-----------|-------|
| `shared/middlewares/` | `verificarTokenAuth`, `verificarPermiso`, `validateDTO`, `uploadMiddleware` | Middlewares reutilizables entre módulos |
| `shared/errors/` | `CustomErrors.ts` — `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError` | Los errores del dominio son clases, no strings |
| `shared/utils/` | `ApiResponse`, `accessScope`, `cacheUtility`, `createRouter`, `paginate`, `ids`, `roleHierarchy`… | Utilidades sin estado, reutilizables |
| `shared/types/` | `auth.ts`, `pagination.ts`, `express.d.ts` | Tipos compartidos (incluye la ampliación de `Express.Request`) |
| `shared/dto/` | `pagination.schema.ts` | Schemas Joi reutilizables |
| `shared/handlers/` | `GlobalErrorHandler` | Traduce errores semánticos a JSON + `asyncHandler` |

---

## Flujo completo de una request

```
POST /api/spaces/:sucursalPublicId
   │
   ├─ app.ts ──── helmet, cors, compression, rate limit, express.json
   │
   ├─ routes/space.route.ts
   │    ├─ resolveAuthorization      → verifica el token y resuelve EN CALIENTE
   │    │                             role / permissions / company_ids / scope_level
   │    ├─ verificarPermiso(...)     → ¿tiene el permiso? (system.full_access bypasea)
   │    └─ validateDTO(schema)       → valida el body → req.validatedData
   │
   ├─ controllers/space.controller.ts
   │    └─ lee req.params / req.validatedData, llama al service
   │
   ├─ service/space.service.ts
   │    ├─ valida scope (assertCompanyScope sobre company_ids)
   │    ├─ valida catálogos y límites de plan
   │    ├─ abre transacción si toca >1 tabla
   │    └─ llama al repository
   │
   ├─ repository/space.repository.ts
   │    └─ Sequelize → PostgreSQL
   │
   └─ dto/space.dto.ts → ApiResponse.ok(res, ...) → JSON al front
```

### Errores: el camino inverso

```
Error semántico lanzado en service/…
   ↓ (sin try/catch en el controller)
GlobalErrorHandler.handleError
   ↓
{ success: false, error: { code, status, message, details } }
```

---

## Reglas de oro

1. **La dirección es fija.** `routes → dto → controllers → service → repository → database`. Nunca al revés.
2. **`interfaces/` es una hoja.** No importa de `models/`, `services/`, `repositories/` ni `dto/`.
3. **Un módulo no importa los internos de otro.** Cruza por `interfaces/` (contratos) o `shared/` (transversal).
4. **El service no toca Sequelize.** El repository no tiene reglas de negocio.
5. **El front nunca ve ids internos de entidades del tenant.** Solo `public_id` (UUID). Excepción: los catálogos de sistema (país, ubigeo, deporte, superficie, pago, rol, permiso) exponen su `id` porque el front los usa como valor de select.
6. **Los errores son clases semánticas**, no strings.
7. **El scope lo decide el ROL, el permiso habilita la ACCIÓN.** `scope_level` (en `dsg_bss_role`) define hasta dónde se ve; `verificarPermiso` define qué se puede hacer. Un permiso nunca amplía el alcance de datos.
8. **Una query por función de repository.**
9. **Los mensajes de Joi son explícitos.** Ningún usuario ve el texto genérico de Joi.
10. **Si un módulo necesita una capa que no existe, se crea la carpeta** — no se saltea la capa ni se mete lógica en otra.

---

## Checklist para un módulo nuevo

```
miModulo/
├── routes/        miModulo.route.ts + index.routes.ts
├── dto/           miModulo.schema.ts (Joi) + miModulo.dto.ts (salida)
├── interfaces/    miModulo.interface.ts (contratos del service)
├── controllers/   miModulo.controller.ts
├── service/       miModulo.service.ts
├── repository/    miModulo.repository.ts
└── database/
    ├── models/    miModulo.ts (+ index.ts con las associations)
    ├── migrations/
    └── seeders/
```

### Verificación automática

Estos comandos corren desde `BACKEND_APP/src/modules`. **Cada uno debe salir vacío** (o sin hallazgos):

```bash
# 1. interfaces/ es una hoja — no importa de models, services, repositories ni dto
grep -rn "from '.*\(database/models\|service/\|repository/\|dto/\)" */interfaces/

# 2. Los contratos de payload viven en interfaces/, no en service/
grep -rn "^export interface \w*Input\|^export type \w*Input\|^export interface List\w*Query" */service/

# 3. Todas las routes usan createRouter() (nunca Router() directo)
grep -rn "from 'express'" */routes/*.ts | grep -v createRouter

# 4. Las entidades del TENANT no exponen ids internos (los catálogos sí: ver nota)
grep -rnE "^\s+(id|company_id|space_id|sucursal_id|user_id|media_id|tenant_id|persona_id)\s*:" \
  */dto/company.dto.ts */dto/space.dto.ts */dto/sucursal.dto.ts \
  */dto/media.dto.ts */dto/userManage.dto.ts */dto/loginAdmin.dto.ts 2>/dev/null \
  | grep -vE "country_id|ubigeo_id"

# 5. Los services no hablan con Sequelize — van por el repository
grep -rnE "\b(Model|sequelize)\.(findAll|findOne|findByPk|create|update|destroy|count|query)\(" */service/*.ts
```

> **Nota sobre el #4:** los **catálogos de sistema** (país, ubigeo, tipo de deporte, superficie, tipo de pago, rol, permiso, menú) sí exponen su `id` — el front los usa como valor de los selects. La regla aplica a las **entidades del tenant**: empresa, sucursal, espacio, usuario y media solo exponen `public_id`.

### Verificación manual

- [ ] ¿El orden de middlewares es `resolveAuthorization` → `verificarPermiso` → `validateDTO` → handler?
- [ ] ¿Toda ruta sensible tiene `verificarPermiso(...)`? (las públicas — webhook de MercadoPago, login — son la excepción)
- [ ] ¿El schema Joi tiene mensajes explícitos por campo (nunca el texto genérico de Joi)?
- [ ] ¿El DTO de salida expone solo `publicId` y campos de negocio?
- [ ] ¿El service lanza errores semánticos (`NotFoundError`, `ForbiddenError`…) y nunca devuelve HTTP?
- [ ] ¿El repository hace **una query por función** y sin reglas de negocio?
- [ ] ¿El modelo tiene su migración en `database/migrations/`?
- [ ] ¿La interface del módulo exporta los tipos que usan otros módulos? (si nadie los importa, quedan en el modelo)

