import type { InferAttributes, Transaction } from 'sequelize';
import * as UserRepository from '../repository/user.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { User, Person } from '../database/models';

// Campos de perfil editables — de User y de Person en un solo payload.
export type ProfileFields = Partial<Pick<InferAttributes<User>, 'first_name' | 'last_name' | 'email'>>
    & Partial<Pick<InferAttributes<Person>, 'phone' | 'country_id' | 'document_type' | 'document_number' | 'date_birth'>>;

// Usuario con su persona y su rol.
export const getById = async (id: number) => {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
};

// País existente y habilitado.
export const assertCountryAvailable = async (countryId: number) => {
    const country = await CountryRepository.findById(countryId);
    if (!country) throw new BadRequestError('El país seleccionado no existe.');
    if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');
};

/**
 * Aplica sobre un usuario ya cargado los cambios de User y de Person (creando la persona si
 * todavía no existe). Correo vacío se guarda como null — dos '' chocarían contra el índice único,
 * dos NULL no.
 */
export const applyProfileChanges = async (
    user: User,
    data: ProfileFields & Partial<Pick<InferAttributes<User>, 'is_enabled' | 'role_id'>>,
    transaction?: Transaction,
) => {
    const { phone, country_id, document_type, document_number, date_birth, ...userFields } = data;

    if (userFields.email === '') userFields.email = null;
    if (userFields.email && userFields.email !== user.email) {
        const existing = await UserRepository.findByEmail(userFields.email);
        if (existing && Number(existing.user_id) !== Number(user.user_id)) {
            throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
        }
    }

    if (country_id !== undefined) await assertCountryAvailable(country_id);

    const personFields: Partial<InferAttributes<Person>> = {};
    if (phone !== undefined) personFields.phone = phone;
    if (country_id !== undefined) personFields.country_id = country_id;
    if (document_type !== undefined) personFields.document_type = document_type;
    if (document_number !== undefined) personFields.document_number = document_number;
    if (date_birth !== undefined) personFields.date_birth = date_birth || null;

    if (Object.keys(userFields).length > 0) {
        await UserRepository.update(user, userFields, transaction);
    }

    if (Object.keys(personFields).length > 0) {
        await UserRepository.upsertPersonForUser(Number(user.user_id), personFields, transaction);
    }
};

// Autoedición del propio perfil — sin rol ni habilitado.
export const updateOwnProfile = async (userId: number, data: ProfileFields) => {
    const user = await getById(userId);
    await applyProfileChanges(user, data);
    return getById(userId);
};
