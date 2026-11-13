import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId, validateQuery } from '../../../shared/middlewares/validateDTO';
import { createManualBookingSchema, listSpaceBookingsSchema, registerBookingPaymentSchema } from '../dto/booking.schema';
import { create, listBySpace, registerPayment } from '../controllers/bookingAdmin.controller';

const router = createRouter();

// La ruta exige el permiso de acción; el service solo valida que el espacio
// pertenezca a una sucursal dentro del alcance del usuario.
router.post('/spaces/:spacePublicId',
    resolveAuthorization('booking.create', 'payment.create'),
    validatePublicId('spacePublicId'),
    validateDTO(createManualBookingSchema),
    create
);

/**
 * @route POST /api/bookings/admin/bookings/:bookingId/payments
 * @desc  Registra un cobro de la reserva (ej. el saldo al llegar a la cancha), total o parcial
 * @access payment.confirmed, sobre reservas de espacios dentro del alcance del usuario
 */
router.post('/bookings/:bookingId/payments',
    resolveAuthorization('payment.confirmed'),
    validateDTO(registerBookingPaymentSchema),
    registerPayment
);

router.get('/spaces/:spacePublicId',
    resolveAuthorization('booking.view'),
    validatePublicId('spacePublicId'),
    validateQuery(listSpaceBookingsSchema),
    listBySpace
);

export default router;
