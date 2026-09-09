import { createRouter } from '../../../shared/utils/createRouter';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { loginAdminSchema } from '../dto/loginAdmin.schema';
import { loginAdmin } from '../controllers/auth.controller';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', authRoutes).
/**
 * @route POST /api/auth/login
 * @desc  Login del panel admin — bloquea usuarios con role 'cliente' o deshabilitados
 * @access Público
 */
router.post('/auth/login', validateDTO(loginAdminSchema), loginAdmin);

export default router;
