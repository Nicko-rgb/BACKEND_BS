import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validateQuery } from '../../../shared/middlewares/validateDTO';
import { listCompaniesQuerySchema, registerCompanySchema } from '../dto/company.schema';
import { list, registerCompany } from '../controllers/company.controller';

const router = createRouter();

/**
 * @route GET /api/companys
 * @desc  Lista las empresas principales (parent_company_id null), paginado, con su dueño y su plan.
 *        `company.view` solo habilita la acción — el alcance (todas vs. las propias) lo decide el
 *        rol en company.service.ts, no el permiso.
 * @access system, super_admin
 */
router.get('/', resolveAuthorization, verificarPermiso('company.view'), validateQuery(listCompaniesQuerySchema), list);

/**
 * @route POST /api/companys/register
 * @desc  Alta de empresa (wizard de 3 pasos: empresa, dueño, plan) — queda pendiente de pago.
 * @access system
 */
router.post('/register', resolveAuthorization, verificarPermiso('company.create'), validateDTO(registerCompanySchema), registerCompany);

export default router;
