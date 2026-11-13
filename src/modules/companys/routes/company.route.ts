import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId, validateQuery } from '../../../shared/middlewares/validateDTO';
import { listCompaniesQuerySchema, registerCompanySchema, updateCompanySchema } from '../dto/company.schema';
import { list, registerCompany, getByPublicId, updateByPublicId, getBranchTree } from '../controllers/company.controller';

const router = createRouter();

/**
 * @route GET /api/v2/companys
 * @desc  Lista las empresas principales (parent_company_id null), paginado, con su dueño y su plan.
 *        `company.view` solo habilita la acción — el alcance (todas vs. las propias) lo decide el
 *        rol en company.service.ts, no el permiso.
 * @access system, super_admin
 */
router.get('/',
    resolveAuthorization('company.view'),
    validateQuery(listCompaniesQuerySchema),
    list
);

/**
 * @route POST /api/v2/companys/register
 * @desc  Alta de empresa (wizard de 3 pasos: empresa, dueño, plan) — queda activa de una.
 * @access system crea primaria; company.create dentro del propio árbol crea hermana.
 */
router.post('/register',
    resolveAuthorization('company.create'),
    validateDTO(registerCompanySchema),
    registerCompany
);

/**
 * @route GET /api/v2/companys/:publicId
 * @desc  Detalle de una empresa
 * @access system, super_admin
 */
router.get('/:publicId',
    resolveAuthorization('company.view'),
    validatePublicId('publicId'),
    getByPublicId
);

/**
 * @route PUT /api/v2/companys/:publicId
 * @desc  Autoedición de la propia empresa (nombre, teléfonos, dirección, país, ubigeo) — sin
 *        `document` (RUC), no se edita desde acá.
 * @access system, super_admin (solo su propia empresa — chequeo manual en el service)
 */
router.put('/:publicId',
    resolveAuthorization('company.edit'),
    validatePublicId('publicId'),
    validateDTO(updateCompanySchema),
    updateByPublicId
);

/**
 * @route GET /api/v2/companys/public/branches/:sucursalPublicId/tree
 * @desc  Árbol empresa → sucursales → espacios con moneda y ventana operativa.
 *        Única fuente de verdad del contexto de empresa para el panel admin.
 * @access Autenticado (panel admin).
 */
router.get('/public/branches/:sucursalPublicId/tree',
    resolveAuthorization(),
    validatePublicId('sucursalPublicId'),
    getBranchTree
);

export default router;
