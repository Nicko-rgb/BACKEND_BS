// Reglas de dinero de la reserva (adelanto + saldo) y su schema de entrada — sin BD.
// node --require tsx/cjs --test tests/bookingPayments.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { planInitialPayments, summarizePayments, planCollection, toCents } = require('../src/modules/bookings/utils/bookingPayments');
const { createManualBookingSchema, registerBookingPaymentSchema } = require('../src/modules/bookings/dto/booking.schema');

const baseBooking = {
    client: { first_name: 'Ana', last_name: 'Pérez', phone: '999888777' },
    booking_date: '2099-12-15', start_time: '18:00', end_time: '19:00',
    total_amount: 40, payment_type_id: 1,
};

test('el alta sin cobro deja el total pendiente en una fila FULL', () => {
    assert.deepEqual(planInitialPayments('PENDING', 40), [{ concept: 'FULL', status: 'PENDING', cents: 4000 }]);
});

test('el alta pagada registra el total cobrado en una fila FULL', () => {
    assert.deepEqual(planInitialPayments('PAID', 40), [{ concept: 'FULL', status: 'PAID', cents: 4000 }]);
});

test('el adelanto crea DEPOSIT cobrado + BALANCE pendiente que suman el total', () => {
    const rows = planInitialPayments('DEPOSIT', 40, 10.5);
    assert.deepEqual(rows, [
        { concept: 'DEPOSIT', status: 'PAID', cents: 1050 },
        { concept: 'BALANCE', status: 'PENDING', cents: 2950 },
    ]);
    assert.equal(rows.reduce((sum, row) => sum + row.cents, 0), toCents(40));
});

test('el adelanto debe ser mayor a 0 y menor al total', () => {
    assert.throws(() => planInitialPayments('DEPOSIT', 40, 40), /menor al precio total/);
    assert.throws(() => planInitialPayments('DEPOSIT', 40, 0), /mayor a 0/);
});

test('no arrastra errores de coma flotante (0.1 + 0.2)', () => {
    const summary = summarizePayments('0.30', [{ amount: '0.10', status: 'PAID' }, { amount: '0.20', status: 'PAID' }]);
    assert.deepEqual(summary, { paidAmount: '0.30', pendingAmount: '0.00', state: 'PAID' });
});

test('el resumen solo cuenta como cobrado lo PAID', () => {
    assert.deepEqual(summarizePayments('40.00', [
        { amount: '10.00', status: 'PAID' }, { amount: '30.00', status: 'PENDING' },
    ]), { paidAmount: '10.00', pendingAmount: '30.00', state: 'PARTIAL' });
    assert.deepEqual(summarizePayments('40.00', [{ amount: '40.00', status: 'PENDING' }]),
        { paidAmount: '0.00', pendingAmount: '40.00', state: 'PENDING' });
    assert.deepEqual(summarizePayments('40.00', [{ amount: '40.00', status: 'REFUNDED' }]),
        { paidAmount: '0.00', pendingAmount: '40.00', state: 'PENDING' });
});

test('cobrar todo el saldo salda la fila pendiente y conserva su concepto', () => {
    assert.deepEqual(planCollection(3000, 3000, 'BALANCE', true), { settlesPending: true, paidConcept: 'BALANCE', remainingCents: 0 });
    assert.deepEqual(planCollection(4000, 4000, 'FULL', false), { settlesPending: true, paidConcept: 'FULL', remainingCents: 0 });
});

test('un cobro parcial sin pagos previos es un adelanto; con pagos previos es saldo', () => {
    assert.deepEqual(planCollection(4000, 1000, 'FULL', false), { settlesPending: false, paidConcept: 'DEPOSIT', remainingCents: 3000 });
    assert.deepEqual(planCollection(3000, 1000, 'BALANCE', true), { settlesPending: false, paidConcept: 'BALANCE', remainingCents: 2000 });
});

test('no permite cobrar más que el pendiente ni cobrar sin saldo', () => {
    assert.throws(() => planCollection(3000, 3001, 'BALANCE', true), /supera el saldo pendiente \(30\.00\)/);
    assert.throws(() => planCollection(0, 100, 'BALANCE', true), /no tiene saldo pendiente/);
});

test('el schema exige deposit_amount solo con DEPOSIT y menor al total', () => {
    const ok = createManualBookingSchema.validate({ ...baseBooking, payment_status: 'DEPOSIT', deposit_amount: 10 });
    assert.equal(ok.error, undefined);

    const missing = createManualBookingSchema.validate({ ...baseBooking, payment_status: 'DEPOSIT' });
    assert.match(missing.error.message, /El adelanto es requerido/);

    const tooHigh = createManualBookingSchema.validate({ ...baseBooking, payment_status: 'DEPOSIT', deposit_amount: 40 });
    assert.match(tooHigh.error.message, /menor al precio total/);

    const forbidden = createManualBookingSchema.validate({ ...baseBooking, payment_status: 'PAID', deposit_amount: 10 });
    assert.match(forbidden.error.message, /solo se envía cuando el pago es DEPOSIT/);

    const defaults = createManualBookingSchema.validate(baseBooking);
    assert.equal(defaults.value.payment_status, 'PENDING');
});

test('el schema del cobro exige monto positivo con 2 decimales y tipo de pago', () => {
    assert.equal(registerBookingPaymentSchema.validate({ amount: 30, payment_type_id: 3 }).error, undefined);
    assert.match(registerBookingPaymentSchema.validate({ amount: 10.123, payment_type_id: 3 }).error.message, /hasta 2 decimales/);
    assert.match(registerBookingPaymentSchema.validate({ amount: '30', payment_type_id: 3 }).error.message, /debe ser un número/);
    assert.match(registerBookingPaymentSchema.validate({ amount: 30 }).error.message, /tipo de pago es requerido/);
});
