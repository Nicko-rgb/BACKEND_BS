import type { User } from '../database/models';

// Forma de un usuario para el frontend — documentType/documentNumber viajan separados
// (se combinan en una sola columna recién en la página, no acá).
export const toUserDto = (user: User) => {
    const person = user.person ?? null;

    return {
        id: user.user_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' '),
        email: user.email,
        phone: person?.phone ?? null,
        country: person?.country ? {
            name: person.country.country,
            flagUrl: person.country.flag_url,
            phoneCode: person.country.phone_code,
        } : null,
        role: user.role,
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
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        isEnabled: user.is_enabled,
        phone: person?.phone ?? null,
        countryId: person?.country_id ?? null,
        documentType: person?.document_type ?? null,
        documentNumber: person?.document_number ?? null,
        dateBirth: person?.date_birth ?? null,
    };
};
