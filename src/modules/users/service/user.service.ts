import type { InferAttributes } from 'sequelize';
import * as UserRepository from '../repository/user.repository';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { User, Person } from '../database/models';

export interface ListUsersQuery extends PaginationQuery {
    search?: string;
    role?: string;
    countryId?: number;
}

// Todos los usuarios del sistema, paginado, con búsqueda (nombre o correo) y filtros por rol y país.
export const list = async (query: ListUsersQuery) => {
    const search = query.search?.trim() || undefined;
    const role = query.role?.trim() || undefined;

    return UserRepository.findAll(query, { search, role, countryId: query.countryId });
};

// Usuario con su persona, para el detalle completo (pantalla de edición).
export const getById = async (id: number) => {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
};

// Payload de edición — combina campos de User y de Person; nunca incluye password.
export type UpdateUserData = Partial<Pick<InferAttributes<User>, 'first_name' | 'last_name' | 'email' | 'role' | 'is_enabled'>>
    & Partial<Pick<InferAttributes<Person>, 'phone' | 'country_id' | 'document_type' | 'document_number' | 'date_birth'>>;

/**
 * Actualiza los datos de un usuario — todo menos password. Separa el payload combinado en
 * los campos que van a `User` y los que van a `Person` (creándola si todavía no existe, ver
 * upsertPersonForUser) y devuelve el usuario recargado con su persona ya fresca.
 */
export const update = async (id: number, data: UpdateUserData) => {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');

    const { phone, country_id, document_type, document_number, date_birth, ...userFields } = data;

    // '' -> null: dos usuarios con email '' chocarían contra el índice único (a diferencia de
    // NULL, que Postgres nunca considera igual a otro NULL). Habrá usuarios invitados sin correo.
    if (userFields.email === '') userFields.email = null;

    if (Object.keys(userFields).length > 0) {
        await UserRepository.update(user, userFields);
    }

    const personFields: Partial<InferAttributes<Person>> = {};
    if (phone !== undefined) personFields.phone = phone;
    if (country_id !== undefined) personFields.country_id = country_id;
    if (document_type !== undefined) personFields.document_type = document_type;
    if (document_number !== undefined) personFields.document_number = document_number;
    if (date_birth !== undefined) personFields.date_birth = date_birth;

    if (Object.keys(personFields).length > 0) {
        await UserRepository.upsertPersonForUser(id, personFields);
    }

    const updated = await UserRepository.findById(id);
    if (!updated) throw new NotFoundError('Usuario no encontrado');
    return updated;
};
