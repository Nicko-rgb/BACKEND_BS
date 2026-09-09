import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { PaymentType, Country } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Tablas que referencian a un tipo de pago.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_payment_booking', column: 'payment_type_id' }];

// Todos los tipos de pago (habilitados e inhabilitados), paginado — listado de administración.
export const findAll = async (pagination: PaginationQuery) => {
    return PaymentType.findAndCountAll({
        include: [{ model: Country, as: 'country' }],
        order: [['name', 'ASC']],
        ...toSequelizePagination(pagination),
    });
};

// Solo tipos de pago habilitados, sin paginar — para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return PaymentType.findAll({
        where: { is_enabled: true },
        include: [{ model: Country, as: 'country' }],
        order: [['name', 'ASC']],
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return PaymentType.findByPk(id);
};

// Busca por país + código — usado antes de crear/actualizar para bloquear duplicados (unique compuesto country_id+code).
export const findByCountryAndCode = async (countryId: number, code: string) => {
    return PaymentType.findOne({ where: { country_id: countryId, code } });
};

// Crea un tipo de pago nuevo.
export const create = async (data: InferCreationAttributes<PaymentType>) => {
    return PaymentType.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (paymentType: PaymentType, data: Partial<InferAttributes<PaymentType>>) => {
    return paymentType.update(data);
};

// Cuenta, por id, cuántos pagos de reservas usan cada tipo de pago — usado para mostrar el total
// en el listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el tipo de pago ya cargado.
export const remove = async (paymentType: PaymentType) => {
    await paymentType.destroy();
};
