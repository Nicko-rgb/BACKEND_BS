import { buildFileUrl } from '../../../shared/middlewares/uploadMiddleware';
import * as MediaCore from '../../system/service/mediaCore.service';
import { PaymentType } from '../../system/database/models';
import * as PaymentAccountRepository from '../repository/paymentAccount.repository';
import type { ManualPaymentAccountInput } from '../interfaces/paymentConfig.interface';
import sequelize from '../../../config/db';
import { encrypt } from '../../../shared/utils/encryption';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import * as MercadoPagoCredentialRepository from '../repository/mercadoPagoCredential.repository';
import { resolveSucursalForUser } from './entityResolver.service';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { RegisterMercadoPagoCredentialInput } from '../interfaces/paymentConfig.interface';

// En esta aplicación, Mercado Pago está habilitado solo para Perú. El país se lee de la sucursal resuelta en la
// DB (nunca de un id enviado por el front) y se valida antes de tocar la credencial.
const MERCADO_PAGO_COUNTRY_ISO = 'PE';

const assertMercadoPagoCountry = (sucursal: { country?: { iso_country: string } | null }) => {
    if (sucursal.country?.iso_country !== MERCADO_PAGO_COUNTRY_ISO) {
        throw new BadRequestError('Mercado Pago solo está disponible para sucursales de Perú');
    }
};

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
    assertMercadoPagoCountry(sucursal);

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
    assertMercadoPagoCountry(sucursal);

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
    assertMercadoPagoCountry(sucursal);

    const credential = await MercadoPagoCredentialRepository.findBySucursalId(sucursal.company_id);
    if (!credential) throw new NotFoundError('La sucursal no tiene una cuenta de Mercado Pago conectada');

    await MercadoPagoCredentialRepository.remove(credential);

    return { sucursal };
};

// Cuentas manuales: siempre se resuelven dentro de la sucursal autorizada.
const resolveManualPayment = async (publicId: string, typeId: number, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(publicId, user);
    if (!Number.isSafeInteger(typeId) || typeId <= 0) throw new BadRequestError('Tipo de pago inválido');
    const type = await PaymentType.findByPk(typeId);
    if (!type) throw new NotFoundError('Tipo de pago no encontrado');
    if (sucursal.country_id == null) throw new BadRequestError('La sucursal debe tener un país asignado');
    if (type.country_id != null && Number(type.country_id) !== Number(sucursal.country_id)) {
        throw new BadRequestError('El tipo de pago no corresponde al país de la sucursal');
    }
    if (type.code.trim().toUpperCase() === 'CASH' || type.category === 'efectivo') {
        throw new BadRequestError('Efectivo no requiere una cuenta de pago');
    }
    if (type.provider?.trim().toLowerCase() === 'mercado pago') {
        throw new BadRequestError('Este tipo de pago se configura mediante las credenciales de Mercado Pago');
    }
    return { sucursal, type };
};

export const listManualAccounts = async (publicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(publicId, user);
    return PaymentAccountRepository.listBySucursal(sucursal.company_id);
};

export const getManualAccount = async (publicId: string, typeId: number, user: AuthenticatedUser) => {
    const { sucursal } = await resolveManualPayment(publicId, typeId, user);
    return PaymentAccountRepository.findBySucursalAndType(sucursal.company_id, typeId);
};

export const saveManualAccount = async (
    publicId: string, typeId: number, data: ManualPaymentAccountInput, user: AuthenticatedUser, file?: Express.Multer.File,
) => {
    try {
        const { sucursal, type } = await resolveManualPayment(publicId, typeId, user);
        if (!type.is_enabled) throw new BadRequestError('El tipo de pago está deshabilitado');
        if (type.code.trim().toUpperCase() === 'PLIN' && !/^9\d{8}$/.test(data.account_number)) {
            throw new BadRequestError('Plin requiere un celular peruano de 9 dígitos que comience con 9');
        }
        const fields = {
            account_name: data.account_name,
            account_number: data.account_number,
            account_alias: data.account_alias || null,
            bank_name: data.bank_name || null,
            is_active: true,
        };
        if (file && data.remove_qr) throw new BadRequestError('No se puede subir y eliminar el QR a la vez');
        return await sequelize.transaction(async (transaction) => {
            await PaymentAccountRepository.lockSucursal(sucursal.company_id, transaction);
            const existing = await PaymentAccountRepository.findBySucursalAndType(sucursal.company_id, typeId, transaction);
            const account = existing
                ? await PaymentAccountRepository.update(existing, { ...fields, user_update: user.user_id }, transaction)
                : await PaymentAccountRepository.create({
                    ...fields, qr_url: null, sucursal_id: sucursal.company_id, payment_type_id: typeId,
                    tenant_id: sucursal.tenant_id, user_create: user.user_id, user_update: null,
                }, transaction);
            if (file) {
                account.qr = await MediaCore.createRecord({
                    medible_id: account.payment_account_id, medible_type: 'PaymentAccount',
                    tenant_id: sucursal.tenant_id, category: 'QR', type: 'IMAGE', is_primary: true,
                    replacePrevious: true, file, user_id: user.user_id,
                }, transaction);
                await PaymentAccountRepository.update(account, { qr_url: account.qr.file_url }, transaction);
            } else if (data.remove_qr) {
                if (account.qr) await MediaCore.removeRecord(account.qr, transaction);
                account.qr = null;
                await PaymentAccountRepository.update(account, { qr_url: null }, transaction);
            }
            return account;
        });
    } catch (error) {
        // La cuenta y Media se revierten; el nuevo archivo no debe quedar huérfano.
        if (file) MediaCore.removePhysicalFile(buildFileUrl(file));
        throw error;
    }
};

export const deleteManualAccount = async (publicId: string, typeId: number, user: AuthenticatedUser) => {
    const { sucursal } = await resolveManualPayment(publicId, typeId, user);
    await sequelize.transaction(async (transaction) => {
        await PaymentAccountRepository.lockSucursal(sucursal.company_id, transaction);
        const account = await PaymentAccountRepository.findBySucursalAndType(sucursal.company_id, typeId, transaction);
        if (!account) throw new NotFoundError('No hay una cuenta configurada para este tipo de pago');
        if (account.qr) await MediaCore.removeRecord(account.qr, transaction);
        await PaymentAccountRepository.remove(account, transaction);
    });
};
