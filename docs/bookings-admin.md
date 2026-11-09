# Reservas manuales del administrador

## Registrar

`POST /api/bookings/admin/spaces/:spacePublicId`

Requiere sesión `admin`, acceso a la sucursal del espacio y permisos
`booking.create`, `booking.confirm`, `payment.create` y `user.client_manage`.
`system.full_access` cubre los permisos, sin ampliar el alcance del usuario.

```json
{
  "client": {
    "first_name": "Ana",
    "last_name": "Pérez",
    "phone": "999888777"
  },
  "booking_date": "2026-12-15",
  "start_time": "18:00",
  "end_time": "19:00",
  "total_amount": 80,
  "payment_type_id": 2,
  "payment_status": "PENDING",
  "notes": "Reserva registrada por recepción"
}
```

- Cliente: solo nombres, apellidos y teléfono obligatorios; correo opcional.
  El país se toma de la sucursal. No acepta rol, contraseña ni creador del cliente.
- Crea `User` con rol `cliente`, `user_create` del administrador y sin contraseña;
  su teléfono se guarda en `Person`. Copia los permisos iniciales del rol.
- Cada alta crea un cliente nuevo. No fusiona personas por teléfono. Si se envía
  un correo que ya existe, devuelve `409`; no modifica la cuenta existente.
- `total_amount` es el precio total manual, positivo y con hasta dos decimales.
  La moneda proviene del país de la sucursal. El tipo de pago debe estar activo
  para ese país y habilitado en la configuración de pagos de la sucursal.
- La reserva nace `CONFIRMED`. El pago nace `PENDING` por defecto; admite `PAID`
  con permiso adicional `payment.confirmed`. `PAID` representa un cobro ya
  recibido manualmente: no ejecuta una transacción en una pasarela.
- Usuario, persona, permisos, pago y reserva se crean en la misma transacción.
  Un error revierte todas sus escrituras.
- Valida sucursal y empresa activas, duración mínima/máxima, horarios abiertos,
  fechas futuras en la zona del país, reservas superpuestas y holds activos.
  Respeta `booking_buffer_minutes`, incluso entre días contiguos.
- Las horas usan `HH:mm`; el fin del día es `24:00`. Una reserva no cruza de día.
- Serializa las altas manuales y cambios de horario con bloqueo del espacio.
  La exclusión existente `excl_booking_no_overlap` protege también frente a
  inserciones concurrentes de reservas desde otros flujos y se traduce a `409`.

Responde `201` con `data.bookingId`, fecha/horas, duración, estado, importe,
notas, contacto del cliente y resumen de pago. No expone contraseñas, permisos,
tenant ni configuración de proveedores.

## Listar reservas de un espacio

`GET /api/bookings/admin/spaces/:spacePublicId?start_date=2026-12-01&end_date=2026-12-31&page=1&limit=20`

Requiere sesión `admin`, permiso `booking.view` y alcance sobre la sucursal.
Las dos fechas son obligatorias e inclusivas; el rango no puede superar 366 días.
`page` comienza en 1 y `limit` admite de 1 a 100. El filtro `status` es opcional:
`PENDING`, `CONFIRMED`, `CANCELED`, `COMPLETED`, `NO_SHOW` o `REJECTED`.

Devuelve `data` como array de reservas y `pagination` con `page`, `limit`,
`total` y `totalPages`. Ordena por fecha, hora y reserva. El calendario debe
recorrer las páginas si el rango contiene más resultados que el límite.

## Verificación local

```sh
npm run typecheck
node --import tsx tests/bookingAdmin.test.cjs
```

Las pruebas simulan los modelos y la transacción; no escriben en PostgreSQL.
No se requieren nuevas tablas ni migraciones para este flujo.
