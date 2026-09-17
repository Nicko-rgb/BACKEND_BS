import { createRouter } from '../../../shared/utils/createRouter';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { loginAdminSchema } from '../dto/loginAdmin.schema';
import { passwordRequestSchema } from '../dto/passwordRequest.schema';
import { passwordResetSchema, passwordResetValidateSchema } from '../dto/passwordReset.schema';
import { loginAdmin, passwordRequest, passwordReset, passwordResetValidateToken } from '../controllers/auth.controller';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', authRoutes).
/**
 * @route POST /api/auth/login
 * @desc  Login del panel admin — bloquea usuarios con role 'cliente' o deshabilitados
 * @access Público
 */
router.post('/auth/login', validateDTO(loginAdminSchema), loginAdmin);

/**
 * @route POST /api/auth/password-request
 * @desc  Envía el enlace de recuperación de contraseña (clientes y administrativos) — respuesta genérica, exista o no el correo
 * @access Público
 */
router.post('/auth/password-request', validateDTO(passwordRequestSchema), passwordRequest);

/**
 * @route POST /api/auth/reset-validate-token
 * @desc  Comprueba que el enlace de recuperación siga vigente, sin consumirlo
 * @access Público
 */
router.post('/auth/reset-validate-token', validateDTO(passwordResetValidateSchema), passwordResetValidateToken);

/**
 * @route POST /api/auth/password-reset
 * @desc  Consume el enlace de recuperación (un solo uso) y guarda la nueva contraseña
 * @access Público
 */
router.post('/auth/password-reset', validateDTO(passwordResetSchema), passwordReset);

export default router;
