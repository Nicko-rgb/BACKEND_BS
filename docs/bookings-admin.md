# Reservas manuales del administrador

## Registrar

`POST /api/v2/bookings/admin/spaces/:spacePublicId`

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
- La reserva nace `CONFIRMED`. `payment_status` indica cuánto se cobró al reservar
  (ver [Pagos: adelanto y saldo](#pagos-adelanto-y-saldo)): `PENDING` (por defecto,
  nada cobrado), `DEPOSIT` (adelanto, con `deposit_amount`) o `PAID` (total).
  `DEPOSIT` y `PAID` exigen además `payment.confirmed`. Son cobros recibidos
  manualmente: no ejecutan una transacción en una pasarela.
- Usuario, persona, permisos, pagos y reserva se crean en la misma transacción.
  Un error revierte todas sus escrituras.
- Valida sucursal y empresa activas, duración mínima/máxima, horarios abiertos,
  fechas futuras en la zona del país, reservas superpuestas y holds activos.
  Respeta `booking_buffer_minutes`, incluso entre días contiguos.
- Las horas usan `HH:mm`; el fin del día es `24:00`. Una reserva no cruza de día.
- Serializa las altas manuales y cambios de horario con bloqueo del espacio.
  La exclusión existente `excl_booking_no_overlap` protege también frente a
  inserciones concurrentes de reservas desde otros flujos y se traduce a `409`.

Responde `201` con `data.bookingId`, fecha/horas, duración, estado, importe,
notas, contacto del cliente, `paymentSummary` y `payments`. No expone contraseñas,
permisos, tenant ni configuración de proveedores.

## Pagos: adelanto y saldo

Cada movimiento de dinero de una reserva es una fila de `dsg_bss_payment_booking`
con `booking_id` y `concept` (migración `051`):

| `concept` | Significado |
|-----------|-------------|
| `FULL`    | Pago único por el total (cobrado o pendiente) |
| `DEPOSIT` | Adelanto cobrado antes del saldo |
| `BALANCE` | Saldo restante, o una fracción de él |

Invariante: en una reserva vigente, cobrado (`PAID`) + pendiente (`PENDING`, a lo
sumo una fila) = `total_amount`. `booking.payment_id` apunta al primer pago.

| `payment_status` al reservar | Filas creadas |
|------------------------------|---------------|
| `PENDING` | `FULL` pendiente por el total |
| `PAID`    | `FULL` cobrado por el total |
| `DEPOSIT` | `DEPOSIT` cobrado por `deposit_amount` + `BALANCE` pendiente por el resto |

`deposit_amount` solo se acepta con `DEPOSIT`: positivo, hasta dos decimales y
menor a `total_amount` (si se cobró todo, se usa `PAID`).

Cada respuesta de reserva incluye:

```json
"paymentSummary": { "currency": "PEN", "paidAmount": "10.00", "pendingAmount": "30.00", "status": "PARTIAL" },
"payments": [
  { "paymentId": 7, "concept": "DEPOSIT", "paymentTypeName": "Yape", "amount": "10.00", "status": "PAID", "paymentDate": "…" },
  { "paymentId": 8, "concept": "BALANCE", "paymentTypeName": "Yape", "amount": "30.00", "status": "PENDING", "paymentDate": null }
]
```

`paymentSummary.status` es `PENDING` (nada cobrado), `PARTIAL` o `PAID`. El tipo
de pago de una fila pendiente es provisional: se reemplaza por el real al cobrar.

### Registrar un cobro (saldo en la cancha)

`POST /api/bookings/admin/bookings/:bookingId/payments`

```json
{ "amount": 30, "payment_type_id": 3 }
```

- Requiere `payment.confirmed` y alcance sobre la sucursal del espacio.
- Solo reservas `PENDING` o `CONFIRMED`. `amount` no puede superar el pendiente.
- Cobro del pendiente completo: la fila `PENDING` pasa a `PAID` con el tipo de
  pago real. Cobro parcial: se agrega una fila `PAID` (`DEPOSIT` si es el primer
  cobro, `BALANCE` si no) y la pendiente baja su monto.
- En efectivo registra `cash_received_at`/`cash_received_by`.
- Bloquea la reserva (`SELECT … FOR UPDATE`): dos cobros simultáneos no pueden
  superar el saldo.

Responde `201` con la reserva actualizada (mismo formato que el alta).

## Listar reservas de un espacio

`GET /api/v2/bookings/admin/spaces/:spacePublicId?start_date=2026-12-01&end_date=2026-12-31&page=1&limit=20`

Requiere sesión `admin`, permiso `booking.view` y alcance sobre la sucursal.
Las dos fechas son obligatorias e inclusivas; el rango no puede superar 366 días.
`page` comienza en 1 y `limit` admite de 1 a 100. El filtro `status` es opcional:
`PENDING`, `CONFIRMED`, `CANCELED`, `COMPLETED`, `NO_SHOW` o `REJECTED`.

Devuelve `data` como array de reservas y `pagination` con `page`, `limit`,
`total` y `totalPages`. Ordena por fecha, hora y reserva. El calendario debe
recorrer las páginas si el rango contiene más resultados que el límite.

## Verificación local

```sh
npm run migrate          # aplica 051_add_booking_payment_ledger (en desarrollo no corre al arrancar)
npm run typecheck
node --require tsx/cjs --test tests/bookingPayments.test.cjs
```

`bookingPayments.test.cjs` prueba las reglas de dinero y los schemas; no escribe en PostgreSQL.
