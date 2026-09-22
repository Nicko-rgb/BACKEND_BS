import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validateQuery } from '../../../shared/middlewares/validateDTO';
import { listCompaniesQuerySchema, registerCompanySchema, updateCompanySchema } from '../dto/company.schema';
import { list, registerCompany, getByPublicId, updateByPublicId } from '../controllers/company.controller';

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
 * @route GET /api/companys/:publicId
 * @desc  Detalle de una empresa — país, ubigeo formateado, dueño y sus sucursales (solo
 *        nombre). Se busca por `public_id` (UUID) — nunca `company_id` ni `tenant_id`.
 * @access system, super_admin
 */
router.get('/:publicId',
    resolveAuthorization,
    verificarPermiso('company.view'),
    getByPublicId
);

/**
 * @route PUT /api/companys/:publicId
 * @desc  Autoedición de la propia empresa (nombre, teléfonos, dirección, país, ubigeo) — sin
 *        `document` (RUC), no se edita desde acá.
 * @access system, super_admin (solo su propia empresa — chequeo manual en el service)
 */
router.put('/:publicId',
    resolveAuthorization,
    verificarPermiso('company.manage_own'),
    validateDTO(updateCompanySchema),
    updateByPublicId
);

export default router;
