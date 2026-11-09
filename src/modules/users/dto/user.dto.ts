import type { User } from '../database/models';

// `roleRef` siempre debe venir incluido (ver user.repository.ts::findAll/findById) — null acá
// solo indicaría que el caller olvidó ese include, no un dato legítimamente ausente.
const roleKey = (user: User): string | null => user.roleRef?.key ?? null;

// Forma de un usuario para el frontend — documentType/documentNumber viajan separados
// (se combinan en una sola columna recién en la página, no acá).
export const toUserDto = (user: User) => {
    const country = user.country ?? null;

    return {
        publicId: user.public_id,
        name: [user.first_name, user.last_name].filter(Boolean).join(' '),
        email: user.email,
        phone: user.phone ?? null,
        country: country ? {
            name: country.country,
            flagUrl: country.flag_url,
            phoneCode: country.phone_code,
        } : null,
        role: roleKey(user),
        isEnabled: user.is_enabled,
        documentType: user.document_type ?? null,
        documentNumber: user.document_number ?? null,
    };
};

// Forma de un usuario para el formulario de edición — countryId crudo (para el value del
// select), en vez del país ya armado para mostrar que usa toUserDto.
export const toUserDetailDto = (user: User) => ({
    publicId: user.public_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: roleKey(user),
    roleId: user.role_id,
    isEnabled: user.is_enabled,
    phone: user.phone ?? null,
    countryId: user.country_id ?? null,
    documentType: user.document_type ?? null,
    documentNumber: user.document_number ?? null,
    dateBirth: user.date_birth ?? null,
});
