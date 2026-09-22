import type { InferAttributes } from 'sequelize';
import { SaaSPlan } from '../database/models';
import { countReferences } from '../../../shared/utils/checkReferences';

// Tablas que referencian a un plan.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_saas_subscriptions', column: 'plan_id' }];

// Todos los planes (activos e inactivos), sin paginar — catálogo chico, no necesita paginación.
export const findAll = async () => {
    return SaaSPlan.findAll({
        order: [['price_monthly', 'ASC']],
    });
};

// Solo planes activos, sin paginar — para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return SaaSPlan.findAll({
        where: { is_active: true },
        order: [['price_monthly', 'ASC']],
    });
};

// Busca por public_id — lo único expuesto en URLs. Uso interno sigue por plan_id numérico.
export const findByPublicId = async (publicId: string) => {
    return SaaSPlan.findOne({ where: { public_id: publicId } });
};

// Busca por PK — SOLO uso interno (nunca exponer).
export const findById = async (id: number) => {
    return SaaSPlan.findByPk(id);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (plan: SaaSPlan, data: Partial<InferAttributes<SaaSPlan>>) => {
    return plan.update(data);
};

// Cuenta, por id, cuántas suscripciones usan cada plan — usado para mostrar el total en el
// listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el plan ya cargado.
export const remove = async (plan: SaaSPlan) => {
    await plan.destroy();
};
