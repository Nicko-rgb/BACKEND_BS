import type { User } from '../database/models';

// `roleRef` siempre debe venir incluido (ver user.repository.ts::findAll/findById) — null acá
// solo indicaría que el caller olvidó ese include, no un dato legítimamente ausente.
const roleKey = (user: User): string | null => user.roleRef?.key ?? null;

// Forma de un usuario para el frontend — documentType/documentNumber viajan separados
// (se combinan en una sola columna recién en la página, no acá).
export const toUserDto = (user: User) => {
    const person = user.person ?? null;

    return {
        publicId: user.public_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' '),
        email: user.email,
        phone: person?.phone ?? null,
        country: person?.country ? {
            name: person.country.country,
            flagUrl: person.country.flag_url,
            phoneCode: person.country.phone_code,
        } : null,
        role: roleKey(user),
        isEnabled: user.is_enabled,
        documentType: person?.document_type ?? null,
        documentNumber: person?.document_number ?? null,
    };
};

// Forma de un usuario para el formulario de edición — countryId crudo (para el value del
// select), en vez del país ya armado para mostrar que usa toUserDto.
export const toUserDetailDto = (user: User) => {
    const person = user.person ?? null;

    return {
        publicId: user.public_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: roleKey(user),
        roleId: user.role_id,
        isEnabled: user.is_enabled,
        phone: person?.phone ?? null,
        countryId: person?.country_id ?? null,
        documentType: person?.document_type ?? null,
        documentNumber: person?.document_number ?? null,
        dateBirth: person?.date_birth ?? null,
    };
};
