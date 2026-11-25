import { accountQrUpload } from '../../../shared/middlewares/accountQrUpload';
import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import { registerMercadoPagoCredentialSchema, manualPaymentAccountSchema } from '../dto/paymentConfig.schema';
import {
    listManualAccounts, getManualAccount, saveManualAccount, deleteManualAccount,
    disconnectMercadoPagoCredential,
    getMercadoPagoStatus,
    registerMercadoPagoCredential,
} from '../controllers/paymentConfig.controller';

const router = createRouter();

/**
 * @route GET /api/v2/payment-config/:sucursalPublicId/mercadopago-credential
 * @desc  Solo indica si la sucursal tiene Mercado Pago conectado (`{ connected }`).
 * @access system, super_admin (dueño de la empresa)
 */
router.get('/:sucursalPublicId/mercadopago-credential',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    getMercadoPagoStatus
);

/**
 * @route POST /api/v2/payment-config/:sucursalPublicId/mercadopago-credential
 * @desc  Registra la credencial de Mercado Pago de una sucursal (upsert por sucursal).
 * @access system, super_admin (dueño de la empresa)
 */
router.post('/:sucursalPublicId/mercadopago-credential',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    validateDTO(registerMercadoPagoCredentialSchema),
    registerMercadoPagoCredential
);

/**
 * @route DELETE /api/v2/payment-config/:sucursalPublicId/mercadopago-credential
 * @desc  Desconecta la cuenta: elimina la credencial de Mercado Pago de la sucursal.
 * @access system, super_admin (dueño de la empresa)
 */
router.delete('/:sucursalPublicId/mercadopago-credential',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    disconnectMercadoPagoCredential
);

// Una cuenta manual por sucursal y tipo de pago.
router.get('/:sucursalPublicId/manual-accounts',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    listManualAccounts
);

router.get('/:sucursalPublicId/manual-accounts/:paymentTypeId',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    getManualAccount
);
router.put('/:sucursalPublicId/manual-accounts/:paymentTypeId',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    accountQrUpload,
    validateDTO(manualPaymentAccountSchema),
    saveManualAccount
);
router.delete('/:sucursalPublicId/manual-accounts/:paymentTypeId',
    resolveAuthorization('payment.account_manage'),
    validatePublicId('sucursalPublicId'),
    deleteManualAccount
);



export default router;
