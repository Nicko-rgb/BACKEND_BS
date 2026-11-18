import sequelize from '../../../config/db';
import { encrypt } from '../../../shared/utils/encryption';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import * as MercadoPagoCredentialRepository from '../repository/mercadoPagoCredential.repository';
import { resolveSucursalForUser } from './entityScope.service';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { RegisterMercadoPagoCredentialInput } from '../interfaces/paymentConfig.interface';

/**
 * Registra (o reemplaza) la credencial de Mercado Pago de una sucursal.
 *
 * `resolveSucursalForUser` valida public_id + alcance y solo devuelve sucursales
 * (`parent_company_id` no nulo), así que una empresa principal no puede conectar
 * una cuenta acá. El access token se encripta antes de tocar la DB y nunca se
 * devuelve: la respuesta solo expone ambiente y fecha de conexión.
 */
export const registerMercadoPagoCredential = async (
    sucursalPublicId: string,
    data: RegisterMercadoPagoCredentialInput,
    user: AuthenticatedUser,
) => {
    const sucursal = await resolveSucursalForUser(sucursalPublicId, user);

    const fields = {
        access_token_encrypted: encrypt(data.access_token),
        public_key: data.public_key || null,
        environment: data.environment || 'SANDBOX',
        is_active: true,
        connected_at: new Date(),
    };

    const credential = await sequelize.transaction(async (transaction) => {
        const existing = await MercadoPagoCredentialRepository.findBySucursalId(sucursal.company_id, transaction);
        if (existing) {
            return MercadoPagoCredentialRepository.update(existing, { ...fields, user_update: user.user_id }, transaction);
        }

        return MercadoPagoCredentialRepository.create({
            sucursal_id: sucursal.company_id,
            tenant_id: sucursal.tenant_id,
            ...fields,
            user_create: user.user_id,
            user_update: null,
        }, transaction);
    });

    return { credential };
};

/**
 * Solo informa si la sucursal tiene Mercado Pago conectado.
 *
 * No expone ni valida la credencial: el panel únicamente necesita saber si
 * mostrar el botón de desconectar o el formulario de registro.
 */
export const getMercadoPagoStatus = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(sucursalPublicId, user);

    const credential = await MercadoPagoCredentialRepository.findBySucursalId(sucursal.company_id);

    return { connected: Boolean(credential) };
};

/**
 * Elimina la credencial de Mercado Pago de una sucursal.
 *
 * El token encriptado se borra con el registro; volver a conectar crea uno
 * nuevo. 404 si no había nada que desconectar.
 */
export const disconnectMercadoPagoCredential = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(sucursalPublicId, user);

    const credential = await MercadoPagoCredentialRepository.findBySucursalId(sucursal.company_id);
    if (!credential) throw new NotFoundError('La sucursal no tiene una cuenta de Mercado Pago conectada');

    await MercadoPagoCredentialRepository.remove(credential);

    return { sucursal };
};
