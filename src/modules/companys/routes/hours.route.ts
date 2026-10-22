import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { registerHourSchema, updateHourSchema } from '../dto/hour.schema';
import { listHours, registerHour, updateHour, toggleHourClosed } from '../controllers/hour.controller';

const router = createRouter();

/**
 * @route GET /api/hours/space/:spacePublicId/list
 * @desc  Bloques de horario del espacio — cada uno es día + rango + precio y
 *        aplica a todas las semanas (es semanal, sin fechas)
 * @access usuarios con permiso space.business_hour_manage (sobre espacios de su alcance)
 */
router.get('/space/:spacePublicId/list',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    listHours
);

/**
 * @route POST /api/hours/space/:spacePublicId/hour
 * @desc  Registra un bloque de horario (día + rango 00:00–24:00 + precio).
 *        Valida scope (dueño/admin/empleado de la sucursal del espacio, system
 *        bypasea), rango dentro del mismo día y anti-solapamiento por día.
 * @access usuarios con permiso space.business_hour_manage
 */
router.post('/space/:spacePublicId/hour',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    validateDTO(registerHourSchema),
    registerHour
);

/**
 * @route PUT /api/hours/space/:spacePublicId/hour/:hourId
 * @desc  Actualiza un bloque de horario (el id interno no expone datos
 *        sensibles). Valida scope, pertenencia del bloque a ESTE espacio y
 *        rango/no-solapamiento con los valores efectivos.
 * @access usuarios con permiso space.business_hour_manage
 */
router.put('/space/:spacePublicId/hour/:hourId',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    validateDTO(updateHourSchema),
    updateHour
);

/**
 * @route PATCH /api/hours/space/:spacePublicId/hour/:hourId/close
 * @desc  Habilita/deshabilita UN bloque (is_closed) — bloquea el bloque, no el
 *        día entero: los otros bloques del día siguen operando.
 * @access usuarios con permiso space.business_hour_manage
 */
router.patch('/space/:spacePublicId/hour/:hourId/close',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    toggleHourClosed
);

export default router;
