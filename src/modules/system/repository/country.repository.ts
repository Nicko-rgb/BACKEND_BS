import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Country } from '../database/models';
import { countReferences } from '../../../shared/utils/checkReferences';

// Tablas que referencian a un país — empresas, tipos de pago y usuarios (persona).
const REFERENCE_CHECKS = [
    { table: 'dsg_bss_company', column: 'country_id' },
    { table: 'dsg_bss_payment_types', column: 'country_id' },
    { table: 'dsg_bss_person', column: 'country_id' },
];

// Todos los países (activos e inactivos), sin paginar — catálogo chico, no filtra por is_active.
export const findAll = async () => {
    return Country.findAll({
        order: [['country', 'ASC']],
    });
};

// Solo países activos, sin paginar — para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return Country.findAll({
        where: { is_active: true },
        order: [['country', 'ASC']],
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return Country.findByPk(id);
};

// Busca por código ISO — usado antes de crear para bloquear duplicados con un mensaje claro.
export const findByIsoCountry = async (isoCountry: string) => {
    return Country.findOne({ where: { iso_country: isoCountry } });
};

// Crea un país nuevo.
export const create = async (data: InferCreationAttributes<Country>) => {
    return Country.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (country: Country, data: Partial<InferAttributes<Country>>) => {
    return country.update(data);
};

// Cuenta, por id, cuántas empresas/tipos de pago/usuarios referencian a cada país — usado para
// mostrar el total en el listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el país ya cargado.
export const remove = async (country: Country) => {
    await country.destroy();
};
