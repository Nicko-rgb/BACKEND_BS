import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId, validateQuery } from '../../../shared/middlewares/validateDTO';
import { createManualBookingSchema, listSpaceBookingsSchema } from '../dto/booking.schema';
import { create, listBySpace } from '../controllers/bookingAdmin.controller';

const router = createRouter();

// La ruta exige el permiso de acción; el service solo valida que el espacio
// pertenezca a una sucursal dentro del alcance del usuario.
router.post('/spaces/:spacePublicId',
    resolveAuthorization('booking.create', 'payment.create'),
    validatePublicId('spacePublicId'),
    validateDTO(createManualBookingSchema),
    create
);

router.get('/spaces/:spacePublicId',
    resolveAuthorization('booking.view'),
    validatePublicId('spacePublicId'),
    validateQuery(listSpaceBookingsSchema),
    listBySpace
);

export default router;
