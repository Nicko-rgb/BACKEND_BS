import { Op } from 'sequelize';
import type { InferAttributes, CreationAttributes, Transaction } from 'sequelize';
import { User } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Usuario con su role_id y su rol (roleRef.key, para el bloqueo de 'cliente' en el login) — ya
// no hace falta eager-cargar directPermissions/companyAssignments acá, authorizationResolver los
// resuelve por su cuenta (con cache) contra dsg_bss_user_permissions/dsg_bss_user_company
// (el rol solo aporta key + scope_level).
export const findByEmailForLogin = async (email: string) => {
    return User.findOne({ where: { email }, include: [{ association: 'roleRef' }] });
};

// Busca por correo — usado para bloquear un alta con un correo ya registrado.
export const findByEmail = async (email: string) => {
    return User.findOne({ where: { email } });
};

export const lockById = async (userId: number, transaction: Transaction) => {
    return User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
};

// Crea el usuario dentro de una transacción — usado por el alta de empresa (dueño nuevo).
export const create = async (data: CreationAttributes<User>, transaction: Transaction) => {
    return User.create(data, { transaction });
};

export interface UserFilters {
    search?: string;
    role?: string;
    countryId?: number;
    companyIds?: number[];
}

/**
 * Todos los usuarios del sistema, paginado, con su país (include `country`).
 * `search` busca por nombre o correo; `countryId` filtra exacto. `role` filtra
 * por la key del rol vía el join a `roleRef` (dsg_bss_role) — no contra una
 * columna de texto. `role` va en un `where` sobre el include, por eso
 * `required: true` en ese caso (si no, con `left join` dejaría pasar todos).
 */
export const findAll = async (pagination: PaginationQuery, filters: UserFilters = {}) => {
    const { search, role, countryId, companyIds } = filters;

    return User.findAndCountAll({
        where: {
            ...(countryId ? { country_id: countryId } : {}),
            ...(search ? {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ],
            } : {}),
        },
        include: [
            ...(companyIds ? [{
                association: 'companyAssignments',
                attributes: [],
                required: true,
                where: { company_id: { [Op.in]: companyIds }, is_active: true },
            }] : []),
            { association: 'country' },
            {
                association: 'roleRef',
                required: Boolean(role),
                where: role ? { key: role } : undefined,
            },
        ],
        order: [['created_at', 'DESC']],
        distinct: true,
        ...toSequelizePagination(pagination),
    });
};

// Busca por public_id, con su país y su rol — lo único expuesto en URLs. Uso interno sigue por user_id.
export const findByPublicId = async (publicId: string) => {
    return User.findOne({ where: { public_id: publicId }, include: [{ association: 'country' }, { association: 'roleRef' }] });
};

// Busca por PK — SOLO uso interno (auth, FKs, nunca exponer).
export const findById = async (id: number) => {
    return User.findByPk(id, { include: [{ association: 'country' }, { association: 'roleRef' }] });
};

// Rol y estado de un usuario — lo mínimo para resolver su autorización en cada request.
export const findAuthStateById = async (id: number) => {
    return User.findByPk(id, { attributes: ['user_id', 'role_id', 'is_enabled'] });
};

// Cambia la contraseña y registra el momento del cambio.
export const updatePassword = async (userId: number, hashedPassword: string, transaction: Transaction) => {
    return User.update(
        { password: hashedPassword, password_changed_at: new Date() },
        { where: { user_id: userId }, transaction }
    );
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (user: User, data: Partial<InferAttributes<User>>, transaction?: Transaction) => {
    return user.update(data, { transaction });
};

