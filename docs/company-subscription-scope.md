# Empresas y suscripción compartida

`SaaSSubscriptionCompany` vincula cada empresa raíz (primaria o hermana) con la
suscripción que la cubre. La fila con `is_primary = true` identifica a la titular.
Las sucursales resuelven la cobertura mediante su empresa padre; no necesitan
otra fila en la tabla puente. Primaria, hermanas y sucursales comparten `tenant_id`.

## Alta: POST /api/companys/register

- Alcance global (`scope_level = 1`, actualmente `system`): requiere `plan`, crea
  un tenant, una suscripción y un vínculo primario dentro de la misma transacción.
- Otros alcances: requieren permiso `company.create` (o el bypass de acción
  existente) y una empresa/sucursal asignada. No pueden enviar `plan`. Crean una
  hermana con el tenant y la suscripción de origen, con `is_primary = false`.
- `source_company_public_id` selecciona una empresa a la que el actor tiene
  acceso directo o mediante una sucursal asignada. Si se omite, solo se resuelve
  automáticamente cuando las entidades autorizadas corresponden a un único
  grupo y suscripción. La selección nunca amplía el alcance a otro árbol.
- La suscripción de origen debe estar vigente, permitir multiempresa y tener
  una primaria del mismo tenant. La empresa de origen debe estar habilitada.
- Solo el alta de primaria requiere `owner` y crea al dueño con `is_owner = true`.
  La hermana no admite `owner`: hereda el dueño del grupo y no crea otro usuario.
  Un creador que no sea dueño no obtiene acceso automático a la hermana.
- El backend genera/hereda `tenant_id`; el payload no admite `tenant_id` ni
  `is_primary`. Una hermana tiene `parent_company_id = NULL`.

## Vigencia y consumo

`planLimits.service.ts` consulta puente → suscripción → plan. Solo `ACTIVE` y
`TRIAL` permiten consumir recursos, dentro de sus fechas de vigencia. El final
del período es exclusivo. Las suscripciones manuales existentes sin fechas
siguen siendo válidas mientras estén activas; este cambio no introduce cobro.
Una cancelación programada conserva acceso hasta el fin del período mientras
el estado permanezca activo. `CANCELED` no concede acceso.

Los cupos se cuentan por empresa y sus sucursales, nunca por tenant o por
suscripción. Un usuario en varias sucursales de la misma empresa cuenta una
sola vez. El dueño consume un cupo en cada empresa del grupo, sin duplicarlo si además
posee asignaciones directas en sus sucursales. Se conserva la convención
existente de 999 o más como ilimitado; incluso un cupo ilimitado exige vigencia.

`assertPlanFeature` valida vigencia y disponibilidad de características booleanas;
el alta de hermanas lo utiliza para `allowsMultiCompany`. Desactivar un plan del
catálogo impide nuevas contrataciones, pero no cancela contratos existentes.

`UserCompany` no tiene `role`, `scope_type` ni `scope_level`. El rol sigue en `User`.
Una membresía `is_owner = true` apunta exclusivamente a la primaria. El dueño
obtiene las empresas de la suscripción y sus sucursales. Para no dueños, asignarse
a una empresa incluye sus sucursales; asignarse a una sucursal incluye solo esa
sucursal. Tener el mismo tenant no amplía automáticamente el alcance.

Los baselines 025 y 043 garantizan un dueño por tenant y una primaria por grupo,
con validación diferida al final de la transacción. Una suscripción no puede
quedar sin primaria, ni un grupo sin dueño. La gestión genérica de usuarios no
puede reemplazar la membresía del dueño. No se incluye un flujo de transferencia
de propiedad en esta entrega.

El login y `GET /api/auth/context` sirven `companies[] → sucursales[] → spaces[]`.
Cada empresa incluye `isPrimary`; un padre agregado únicamente para contextualizar
una sucursal tiene `access: false`. El DTO no expone tenant ni PKs internos.
La autorización resuelve el alcance en cada request. El frontend refresca el árbol
al cargar el panel, recuperar foco y tras cambios de estructura/asignaciones.
El contexto persistido anterior se invalida mediante una nueva versión del store.

Estos cambios se aplican a los baselines originales, no mediante una migración
incremental. Una base ya creada debe recrearse de forma explícita para utilizarlos;
volver a ejecutar `migrate` no modifica tablas de baselines ya registrados.
 Los conteos de facturas
mensuales del endpoint de uso siguen pendientes de su implementación previa.

## Verificación

Desde `BACKEND_APP`:

```sh
node --require tsx/cjs --test tests/*.test.cjs
npm run typecheck
```

Las pruebas de registro ejercitan los servicios con persistencia simulada: altas
primarias/hermanas, aislamiento, selección entre grupos, rechazo de planes ajenos,
vigencia y cupos independientes. La prueba adicional de PostgreSQL crea un esquema
aislado dentro de una transacción que siempre se revierte:

```sh
OWNER_DB_TEST=1 node --require tsx/cjs tests/companyOwnership.postgres.test.cjs
```

Esta prueba ejecuta los baselines 025/043 y comprueba restricciones de propiedad,
aislamiento, expansión de alcance y conteo del dueño compartido.
