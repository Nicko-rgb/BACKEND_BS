import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import { updateOwnProfileSchema } from '../dto/user.schema';
import { getOwnProfile, updateOwnProfile, listByCompany } from '../controllers/user.controller';

const router = createRouter();

// Usuarios de la empresa autorizada y sus sucursales, incluido el dueño heredado.
router.get('/company/:companyPublicId/users-for-company', resolveAuthorization('company.view'), validatePublicId('companyPublicId'), listByCompany);

/**
 * @route GET /api/users/me
 * @desc  Detalle del propio perfil, para precargar la página de autoedición
 * @access cualquier usuario autenticado con `user.profile_edit`
 */
router.get('/me', resolveAuthorization('user.profile_view'), getOwnProfile);

/**
 * @route PUT /api/users/me
 * @desc  Autoedición del propio perfil — todo menos password, role e is_enabled
 * @access cualquier usuario autenticado con `user.profile_edit`
 */
router.put('/me', resolveAuthorization('user.profile_edit'), validateDTO(updateOwnProfileSchema), updateOwnProfile);

export default router;
