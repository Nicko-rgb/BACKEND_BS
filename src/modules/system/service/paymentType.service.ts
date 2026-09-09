import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as PaymentTypeRepository from '../repository/paymentType.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { PaymentType } from '../database/models';

// Todos los tipos de pago (activos e inactivos), paginado — listado de administración
export const list = async (pagination: PaginationQuery) => {
    return cacheUtility.withCache('system:payment-types', pagination, async () => {
        const { rows, count } = await PaymentTypeRepository.findAll(pagination);
        const referencesCount = await PaymentTypeRepository.countReferencesByIds(rows.map((row) => row.payment_type_id));
        return { rows, count, referencesCount };
    });
};

// Solo tipos de pago habilitados — endpoint público, sin paginar, para selects/lógica de negocio
export const listActive = async () => {
    return cacheUtility.withCache('system:payment-types:active', {}, () => PaymentTypeRepository.findAllActive());
};

// Crea un tipo de pago nuevo — bloqueado si ya existe uno con el mismo código para ese país
export const create = async (data: InferCreationAttributes<PaymentType>) => {
    const existing = await PaymentTypeRepository.findByCountryAndCode(data.country_id, data.code);
    if (existing) throw new ConflictError(`Ya existe un tipo de pago con el código "${data.code}" para ese país`);

    const created = await PaymentTypeRepository.create(data);
    await cacheUtility.delByPattern('system:payment-types:*');
    return created;
};

// Actualiza un tipo de pago existente — bloqueado si el código ya pertenece a otro del mismo país. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<PaymentType>>) => {
    const paymentType = await PaymentTypeRepository.findById(id);
    if (!paymentType) throw new NotFoundError('Tipo de pago no encontrado');

    if (data.country_id && data.code) {
        const existing = await PaymentTypeRepository.findByCountryAndCode(data.country_id, data.code);
        // payment_type_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.payment_type_id) !== id) {
            throw new ConflictError(`Ya existe un tipo de pago con el código "${data.code}" para ese país`);
        }
    }

    const updated = await PaymentTypeRepository.update(paymentType, data);
    await cacheUtility.delByPattern('system:payment-types:*');
    return updated;
};

// Elimina un tipo de pago — bloqueado si tiene transacciones registradas
export const remove = async (id: number) => {
    const paymentType = await PaymentTypeRepository.findById(id);
    if (!paymentType) throw new NotFoundError('Tipo de pago no encontrado');

    const referencesCount = await PaymentTypeRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar el tipo de pago porque tiene transacciones registradas — desactívalo en su lugar');
    }

    await PaymentTypeRepository.remove(paymentType);
    await cacheUtility.delByPattern('system:payment-types:*');
};
