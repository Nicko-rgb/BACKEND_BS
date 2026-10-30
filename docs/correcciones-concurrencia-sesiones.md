# Concurrencia, migraciones y sesiones

## Aplicación de cambios

El sistema todavía está en desarrollo. Los cambios de esquema se incorporan
directamente al baseline de cada tabla; las tablas nuevas tienen su propio baseline.
Desde `BACKEND_APP`, ejecutar `npm run db:reset` para reconstruir la base de datos
y cargar los seeders. Este comando elimina los datos existentes.

- `019_baseline_business_hour`: crea los horarios y restringe los intervalos semanales por espacio
  y día. Los bloques cerrados también participan, igual que en la validación
  anterior del servicio. Se admiten intervalos contiguos y cierre a las `24:00`.
- `049_baseline_auth_session`: crea la tabla de sesiones JWT revocables en PostgreSQL.

Todos los baselines pasan la transacción a sus consultas, creaciones de tablas
e índices y operaciones de rollback. `npm run migrate` por sí solo no reaplica
baselines ya registrados: para incorporar estos cambios en una base existente
de desarrollo se utiliza `db:reset`, que también reconstruye el seguimiento y
los checksums. Los seeders de horarios deben respetar las restricciones nuevas.

El runner serializa cada migración mediante un advisory lock transaccional y
vuelve a consultar su estado después de adquirirlo. También permite reaplicar una
migración revertida actualizando su registro de seguimiento.

## Límites del plan

Se conserva el alcance de los límites existente:

- Sucursales por empresa raíz.
- Espacios por sucursal.
- Usuarios distintos con asignaciones activas en la empresa raíz y sus sucursales.

Altas y reasignaciones toman un bloqueo de la empresa raíz antes de contar,
validar y escribir dentro de la misma transacción. Cuando intervienen varias
empresas, se bloquean en orden de identificador. Las ediciones de asignaciones
toman además un bloqueo del usuario para leer su membresía actualizada.

Las escrituras de horarios bloquean el espacio antes de consultar y modificar
sus bloques. La restricción de exclusión de PostgreSQL protege también frente
a escrituras que no pasan por el servicio.

## Sesiones

- `JWT_EXPIRES` es obligatorio para el administrativo.
- `JWT_EXPIRES_BOOKING` es obligatorio para el portal público.
- Ambas duraciones se validan al arrancar; usar valores positivos como `24h` o `7d`.
- El login administrativo emite un `jti` y registra la sesión en PostgreSQL.
- Cada petición autenticada verifica firma, vencimiento y sesión activa en BD.
- `POST /api/auth/logout`, con Bearer token, revoca únicamente esa sesión.
- El frontend elimina su sesión después de la confirmación o de un 401. Ante
  un error de red o servidor informa el fallo y permite reintentar.
- Restablecer la contraseña revoca todas las sesiones del usuario dentro de
  la misma transacción. El login bloquea el usuario y comprueba nuevamente sus
  credenciales antes de registrar una sesión, evitando carreras con ese cambio.
- Los JWT antiguos sin sesión registrada dejan de aceptarse: los usuarios deben
  iniciar sesión nuevamente después del despliegue.
- Redis no participa en la decisión de revocación. Una caída de PostgreSQL
  impide autenticar; nunca se acepta un token sin consultar su sesión.
- La tarea diaria de limpieza de recuperación elimina también sesiones vencidas.

El futuro login del portal debe registrar sus sesiones usando la misma tabla
y emitir sus JWT con `JWT_EXPIRES_BOOKING`.

## Verificación realizada

Se utilizaron PostgreSQL temporal y datos de prueba, sin ejecutar migraciones
sobre la base configurada en `.env`. Se verificaron migraciones desde cero,
rollback ante fallo, solicitudes concurrentes de sucursales, espacios, usuarios
y horarios, intervalos contiguos, cierre a medianoche, logout sin Redis y
revocación de sesiones al restablecer contraseña. El envío de correo se sustituyó
por un stub únicamente en la verificación temporal.
