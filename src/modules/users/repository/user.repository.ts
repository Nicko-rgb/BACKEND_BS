import { Op } from 'sequelize';
import type { InferAttributes, CreationAttributes, Transaction } from 'sequelize';
import { User, Person } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Usuario con su role_id y su rol (roleRef.key, para el bloqueo de 'cliente' en el login) — ya
// no hace falta eager-cargar directPermissions/companyAssignments acá, authorizationResolver los
// resuelve por su cuenta (con cache) contra dsg_bss_role_permission/dsg_bss_user_permissions/
// dsg_bss_user_company.
export const findByEmailForLogin = async (email: string) => {
    return User.findOne({ where: { email }, include: [{ association: 'roleRef' }] });
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
 * nombre o correo; `countryId` filtra exacto. `role` filtra por la key del rol vía el join
 * a `roleRef` (dsg_bss_role) — no contra la columna legado `role` directo, para que un
 * usuario recién creado (que puede no tener el string legado escrito) siga apareciendo en
 * el filtro. `countryId`/`role` van en un `where` sobre el include correspondiente, por eso
 * `required: true` en esos casos (si no, con `left join` dejaría pasar todos los usuarios igual).
 */
export const findAll = async (pagination: PaginationQuery, filters: UserFilters = {}) => {
    const { search, role, countryId } = filters;

    return User.findAndCountAll({
        where: {
            ...(search ? {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ],
            } : {}),
        },
        include: [
            {
                association: 'person',
                required: Boolean(countryId),
                where: countryId ? { country_id: countryId } : undefined,
                include: [{ association: 'country' }],
            },
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

// Busca por public_id, con su persona y su rol — lo único expuesto en URLs. Uso interno sigue por user_id.
export const findByPublicId = async (publicId: string) => {
    return User.findOne({ where: { public_id: publicId }, include: [{ association: 'person' }, { association: 'roleRef' }] });
};

// Busca por PK — SOLO uso interno (auth, FKs, nunca exponer).
export const findById = async (id: number) => {
    return User.findByPk(id, { include: [{ association: 'person' }, { association: 'roleRef' }] });
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

/**
 * Actualiza la persona del usuario si ya existe, o la crea si todavía no tiene (ej. un usuario
 * creado por `system` sin datos personales cargados). `country_id` es NOT NULL en Person, así
 * que si hay que crear una fila nueva y no vino, no se crea — el caller decide qué hacer con eso
 * (hoy, simplemente no se persisten los demás campos hasta que se mande country_id también).
 */
export const upsertPersonForUser = async (userId: number, data: Partial<InferAttributes<Person>>, transaction?: Transaction) => {
    const existing = await Person.findOne({ where: { user_id: userId }, transaction });
    if (existing) return existing.update(data, { transaction });

    if (!data.country_id) return null;
    return Person.create({ user_id: userId, country_id: data.country_id, ...data }, { transaction });
};
