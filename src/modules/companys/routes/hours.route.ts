import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import { saveScheduleSchema } from '../dto/hour.schema';
import { listHours, saveSchedule, toggleHourClosed, toggleHourDay } from '../controllers/hour.controller';

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
    validatePublicId('spacePublicId'),
    listHours
);

/**
 * @route PUT /api/hours/space/:spacePublicId
 * @desc  Guarda la semana COMPLETA del espacio: crea o reemplaza todos sus
 *        bloques en una transacción. El payload es el estado final — un día sin
 *        bloques es un día ausente del array; `hours: []` deja el espacio sin
 *        horarios. Cada bloque viaja con su `is_closed` (default false) para que
 *        el guardado no pise lo que cerraron los toggles. Valida scope, rango
 *        dentro del mismo día y solapamientos dentro de cada día. Responde la
 *        lista completa ya guardada (los hour_id nuevos).
 * @access usuarios con permiso space.business_hour_manage
 */
router.put('/space/:spacePublicId',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    validatePublicId('spacePublicId'),
    validateDTO(saveScheduleSchema),
    saveSchedule
);

/**
 * @route PATCH /api/hours/space/:spacePublicId/:hourId/close
 * @desc  Habilita/deshabilita UN bloque (is_closed) — bloquea el bloque, no el
 *        día entero: los otros bloques del día siguen operando.
 * @access usuarios con permiso space.business_hour_manage
 */
router.patch('/space/:spacePublicId/:hourId/close',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    validatePublicId('spacePublicId'),
    toggleHourClosed
);

/**
 * @route PATCH /api/hours/space/:spacePublicId/:day
 * @desc  Habilita/deshabilita un día entero: invierte is_closed en TODOS sus
 *        bloques (habilitado → cierra todos; cerrado → abre todos). No recibe
 *        hourId (el día es la unidad, no el bloque) ni body: el estado se
 *        deriva de la BD. Responde { day, isClosed, hours } ya actualizado.
 * @access usuarios con permiso space.business_hour_manage
 */
router.patch('/space/:spacePublicId/:day',
    resolveAuthorization,
    verificarPermiso('space.business_hour_manage'),
    validatePublicId('spacePublicId'),
    toggleHourDay
);
export default router;
