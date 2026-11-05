import type { InferAttributes, Transaction } from 'sequelize';
import * as UserRepository from '../repository/user.repository';
import * as UserCompanyRepository from '../repository/userCompany.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import { assertCompanyScope, hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { User, Person } from '../database/models';
import type { ProfileFields } from '../interfaces/user.interface';

export const listByCompany = async (companyPublicId: string, actor: AuthenticatedUser) => {
    const company = await CompanyRepository.findRootIdentityByPublicId(companyPublicId);
    if (!company) throw new NotFoundError('Empresa no encontrada');
    assertCompanyScope(actor, Number(company.company_id), 'No tenés acceso a esta empresa');
    company.subsidiaries = await CompanyRepository.findBranchIdentitiesByParentId(Number(company.company_id), hasFullCompanyAccess(actor) ? undefined : (actor.company_ids ?? []));
    const ids = [Number(company.company_id), ...company.subsidiaries.map((branch) => Number(branch.company_id))];
    const assignments = await UserCompanyRepository.findActiveByCompanyIds(ids);
    const owner = await UserCompanyRepository.findOwnerByTenantId(company.tenant_id);
    if (owner && !assignments.some((row) => Number(row.user_id) === Number(owner.user_id))) assignments.push(owner);
    return { company, assignments };
};

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
