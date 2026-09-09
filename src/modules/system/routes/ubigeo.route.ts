import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { createUbigeoSchema, updateUbigeoSchema, ubigeoChildrenQuerySchema } from '../dto/ubigeo.dto';
import { listChildren, create, update, remove } from '../controllers/ubigeo.controller';

const router = createRouter();

/**
 * @route GET /api/system/ubigeo
 * @desc  Lista en cascada — ?country_id= trae el nivel 1 de ese país, ?parent_id= trae los hijos directos de un nodo (nunca el árbol completo de una)
 * @access Público
 */
router.get('/ubigeo', validateQuery(ubigeoChildrenQuerySchema), listChildren);

/**
 * @route POST /api/system/ubigeo
 * @desc  Crea un nodo nuevo — nivel 1 de un país o hijo directo de otro nodo
 * @access system
 */
router.post('/ubigeo', resolveAuthorization, verificarPermiso('ubigeo.manage'), validateDTO(createUbigeoSchema), create);

/**
 * @route PUT /api/system/ubigeo/:id
 * @desc  Actualiza el nombre/código de un nodo existente
 * @access system
 */
router.put('/ubigeo/:id', resolveAuthorization, verificarPermiso('ubigeo.manage'), validateDTO(updateUbigeoSchema), update);

/**
 * @route DELETE /api/system/ubigeo/:id
 * @desc  Elimina un nodo — bloqueado si tiene hijos
 * @access system
 */
router.delete('/ubigeo/:id', resolveAuthorization, verificarPermiso('ubigeo.manage'), remove);

export default router;
