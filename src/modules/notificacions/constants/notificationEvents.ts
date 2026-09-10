// Eventos de notificación del sistema — cada uno ya sabe su canal y su plantilla (ver
// service/emailEvents.config.ts, o el análogo de WhatsApp a futuro). Un evento nuevo se
// agrega acá con su interface de payload, y una entrada en el config de su canal.
export const NotificationEvents = {
    COMPANY_PENDING_PAYMENT: 'COMPANY_PENDING_PAYMENT',
    COMPANY_REGISTERED: 'COMPANY_REGISTERED',
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

// Payload de cada evento — uno nuevo agrega su interface arriba y una entrada acá.
export interface NotificationPayloads {
    [NotificationEvents.COMPANY_PENDING_PAYMENT]: CompanyPendingPaymentPayload;
    [NotificationEvents.COMPANY_REGISTERED]: CompanyRegisteredPayload;
}
