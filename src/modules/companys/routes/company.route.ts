import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validateQuery } from '../../../shared/middlewares/validateDTO';
import { listCompaniesQuerySchema, registerCompanySchema } from '../dto/company.schema';
import { list, registerCompany, getByTenantId } from '../controllers/company.controller';

const router = createRouter();

/**
 * @route GET /api/companys
 * @desc  Lista las empresas principales (parent_company_id null), paginado, con su dueño y su plan.
 *        `company.view` solo habilita la acción — el alcance (todas vs. las propias) lo decide el
 *        rol en company.service.ts, no el permiso.
 * @access system, super_admin
 */
router.get('/', 
    resolveAuthorization, 
    verificarPermiso('company.view'),
    validateQuery(listCompaniesQuerySchema),
    list
);

/**
 * @route POST /api/companys/register
 * @desc  Alta de empresa (wizard de 3 pasos: empresa, dueño, plan) — queda activa de una.
 * @access system
 */
router.post('/register',
    resolveAuthorization,
    verificarPermiso('company.create'),
    validateDTO(registerCompanySchema),
    registerCompany
);

/**
 * @route GET /api/companys/:tenantId
 * @desc  Detalle de una empresa — país, ubigeo formateado, dueño y sus sucursales (solo
 *        nombre). Se busca por `tenant_id` (UUID), no por `company_id` — no expone el id
 *        secuencial en la URL del frontend.
 * @access system, super_admin
 */
router.get('/:tenantId',
    resolveAuthorization,
    verificarPermiso('company.view'),
    getByTenantId
);

export default router;
