import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { createPaymentTypeSchema, updatePaymentTypeSchema } from '../dto/paymentType.dto';
import { list, listActive, create, update, remove } from '../controllers/paymentType.controller';

const router = createRouter();

/**
 * @route GET /api/system/payment-types
 * @desc  Lista todos los tipos de pago, paginado
 * @access system
 */
router.get('/payment-types', resolveAuthorization, verificarPermiso('payment_type.manage'), validateQuery(paginationQuerySchema), list);

/**
 * @route GET /api/system/payment-types/active
 * @desc  Lista tipos de pago activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/payment-types/active', listActive);

/**
 * @route POST /api/system/payment-types
 * @desc  Crea un tipo de pago nuevo
 * @access system
 */
router.post('/payment-types', resolveAuthorization, verificarPermiso('payment_type.manage'), validateDTO(createPaymentTypeSchema), create);

/**
 * @route PUT /api/system/payment-types/:id
 * @desc  Actualiza un tipo de pago existente
 * @access system
 */
router.put('/payment-types/:id', resolveAuthorization, verificarPermiso('payment_type.manage'), validateDTO(updatePaymentTypeSchema), update);

/**
 * @route DELETE /api/system/payment-types/:id
 * @desc  Elimina un tipo de pago
 * @access system
 */
router.delete('/payment-types/:id', resolveAuthorization, verificarPermiso('payment_type.manage'), remove);

export default router;
