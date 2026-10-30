/**
 * Tipos de dominio de la persona — capa de contratos del módulo `users`.
 *
 * Viven acá (y no en `database/models/Person.ts`) para que otros módulos
 * consuman el enum sin depender del modelo Sequelize: el modelo importa
 * desde acá, nunca al revés. Espeja el ENUM de dsg_bss_person.
 */

// Género de la persona — columna `gender` de dsg_bss_person.
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';

// Tipo de documento de identidad — columna `document_type` de dsg_bss_person.
export type DocumentType = 'IDENTITY_CARD' | 'PASSPORT' | 'LICENSE' | 'OTHER';

// Estado civil — columna `civil_state` de dsg_bss_person.
export type CivilState = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'COMMON-LAW';

/**
 * Campos de perfil editables — de User y de Person en un solo payload.
 * Compartido por la autoedición del perfil (`user.service.ts`) y la gestión de
 * usuarios por rol (`userManage.service.ts`).
 */
export interface ProfileFields {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    country_id?: number;
    document_type?: DocumentType | null;
    document_number?: string | null;
    date_birth?: string | null;
}
