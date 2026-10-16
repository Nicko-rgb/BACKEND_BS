import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { registerSpaceSchema } from '../dto/space.schema';
import { registerSpace } from '../controllers/space.controller';

const router = createRouter();

/**
 * @route POST /api/spaces/:sucursalPublicId
 * @desc  Registro de un espacio deportivo bajo una sucursal — valida scope
 *        (dueño/admin/empleado de esa sucursal, system bypasea), catálogos y
 *        límite maxSpaces del plan por sucursal
 * @access usuarios con permiso space.create
 */
router.post('/:sucursalPublicId',
    resolveAuthorization,
    verificarPermiso('space.create'),
    validateDTO(registerSpaceSchema),
    registerSpace
);

export default router;
