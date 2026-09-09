import type { InferAttributes } from 'sequelize';
import * as SaaSPlanRepository from '../../saas/repository/saasPlan.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { SaaSPlan } from '../../saas/database/models';

/**
 * Todos los planes(activos e inactivos), sin paginar — catálogo chico, 
 * Listado de administración
 * */
export const list = async () => {
    return cacheUtility.withCache('system:plans', {}, async () => {
        const rows = await SaaSPlanRepository.findAll();
        const referencesCount = await SaaSPlanRepository.countReferencesByIds(rows.map((row) => row.plan_id));
        return { rows, referencesCount };
    });
};

// Solo planes activos — endpoint público, sin paginar, para selects/lógica de negocio
export const listActive = async () => {
    return cacheUtility.withCache('system:plans:active', {}, () => SaaSPlanRepository.findAllActive());
};

// Actualiza un plan existente y limpia el cache de listados ───
export const update = async (id: number, data: Partial<InferAttributes<SaaSPlan>>) => {
    const plan = await SaaSPlanRepository.findById(id);
    if (!plan) throw new NotFoundError('Plan no encontrado');

    const updated = await SaaSPlanRepository.update(plan, data);
    await cacheUtility.delByPattern('system:plans:*');
    return updated;
};

// Elimina un plan — bloqueado si tiene suscripciones asociadas
export const remove = async (id: number) => {
    const plan = await SaaSPlanRepository.findById(id);
    if (!plan) throw new NotFoundError('Plan no encontrado');

    const referencesCount = await SaaSPlanRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar el plan porque tiene suscripciones asociadas');
    }

    await SaaSPlanRepository.remove(plan);
    await cacheUtility.delByPattern('system:plans:*');
};
