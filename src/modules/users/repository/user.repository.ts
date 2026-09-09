import { Op } from 'sequelize';
import type { InferAttributes, CreationAttributes, Transaction } from 'sequelize';
import { User, UserPermission, UserCompany, Person } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Usuario con sus permisos directos y asignaciones de empresa/sucursal, para armar el JWT del login.
export const findByEmailForLogin = async (email: string) => {
    return User.findOne({
        where: { email },
        include: [
            { model: UserPermission, as: 'directPermissions' },
            { model: UserCompany, as: 'companyAssignments' },
        ],
    });
};

// Busca por correo — usado para bloquear un alta con un correo ya registrado.
export const findByEmail = async (email: string) => {
    return User.findOne({ where: { email } });
};

// Crea el usuario dentro de una transacción — usado por el alta de empresa (dueño nuevo).
export const create = async (data: CreationAttributes<User>, transaction: Transaction) => {
    return User.create(data, { transaction });
};

// Crea la persona del usuario dentro de una transacción — a diferencia de upsertPersonForUser
// (edición, fuera de transacción), este alta siempre es un usuario recién creado sin persona previa.
export const createPerson = async (data: CreationAttributes<Person>, transaction: Transaction) => {
    return Person.create(data, { transaction });
};

export interface UserFilters {
    search?: string;
    role?: string;
    countryId?: number;
}

/**
 * Todos los usuarios del sistema, paginado, con su persona (`person`, incluye `country`)
 * — de ahí salen phone, country, document_type y document_number. `search` busca por
 * nombre o correo; `role` y `countryId` filtran exacto. `countryId` va en un `where` sobre
 * el include de `person`, por eso `required: true` en ese caso (si no, con `left join`
 * dejaría pasar usuarios sin persona igual).
 */
export const findAll = async (pagination: PaginationQuery, filters: UserFilters = {}) => {
    const { search, role, countryId } = filters;

    return User.findAndCountAll({
        where: {
            ...(role ? { role } : {}),
            ...(search ? {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ],
            } : {}),
        },
        include: [{
            association: 'person',
            required: Boolean(countryId),
            where: countryId ? { country_id: countryId } : undefined,
            include: [{ association: 'country' }],
        }],
        order: [['created_at', 'DESC']],
        distinct: true,
        ...toSequelizePagination(pagination),
    });
};

// Busca por PK, con su persona — usado antes de editar y para devolver el detalle completo.
export const findById = async (id: number) => {
    return User.findByPk(id, { include: [{ association: 'person' }] });
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (user: User, data: Partial<InferAttributes<User>>, transaction?: Transaction) => {
    return user.update(data, { transaction });
};

/**
 * Actualiza la persona del usuario si ya existe, o la crea si todavía no tiene (ej. un usuario
 * creado por `system` sin datos personales cargados). `country_id` es NOT NULL en Person, así
 * que si hay que crear una fila nueva y no vino, no se crea — el caller decide qué hacer con eso
 * (hoy, simplemente no se persisten los demás campos hasta que se mande country_id también).
 */
export const upsertPersonForUser = async (userId: number, data: Partial<InferAttributes<Person>>) => {
    const existing = await Person.findOne({ where: { user_id: userId } });
    if (existing) return existing.update(data);

    if (!data.country_id) return null;
    return Person.create({ user_id: userId, country_id: data.country_id, ...data });
};
