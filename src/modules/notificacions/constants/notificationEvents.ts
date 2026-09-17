// Eventos de notificación del sistema — cada uno ya sabe su canal y su plantilla (ver
// service/emailEvents.config.ts, o el análogo de WhatsApp a futuro). Un evento nuevo se
// agrega acá con su interface de payload, y una entrada en el config de su canal.
export const NotificationEvents = {
    COMPANY_PENDING_PAYMENT: 'COMPANY_PENDING_PAYMENT',
    COMPANY_REGISTERED: 'COMPANY_REGISTERED',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
} as const;

export type NotificationEvent = typeof NotificationEvents[keyof typeof NotificationEvents];

export interface CompanyPendingPaymentPayload {
    ownerId: number;
    ownerEmail: string;
    ownerName: string;
    companyId: number;
    companyName: string;
    planName: string;
    paymentUrl: string;
    tenantId: string;
    createdBy: number;
}

// Bienvenida al dueño — empresa ya activa (alta directa, sin paso de pago).
export interface CompanyRegisteredPayload {
    ownerId: number;
    ownerEmail: string;
    ownerName: string;
    companyId: number;
    companyName: string;
    planName: string;
    tenantId: string;
    createdBy: number;
}

// Enlace de recuperación de contraseña — resetUrl lleva el token en claro, nunca se persiste ni se loguea.
export interface ForgotPasswordPayload {
    email: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
}

// Aviso posterior al cambio de contraseña — para que el dueño detecte un acceso que no hizo.
export interface PasswordChangedPayload {
    email: string;
    name: string;
    loginUrl: string;
}

// Payload de cada evento — uno nuevo agrega su interface arriba y una entrada acá.
export interface NotificationPayloads {
    [NotificationEvents.COMPANY_PENDING_PAYMENT]: CompanyPendingPaymentPayload;
    [NotificationEvents.COMPANY_REGISTERED]: CompanyRegisteredPayload;
    [NotificationEvents.FORGOT_PASSWORD]: ForgotPasswordPayload;
    [NotificationEvents.PASSWORD_CHANGED]: PasswordChangedPayload;
}
