import type { InferAttributes } from 'sequelize';
import { companyPendingPaymentTemplate } from '../templates/email/companyPendingPayment';
import { companyRegisteredTemplate } from '../templates/email/companyRegistered';
import { forgotPasswordTemplate } from '../templates/email/forgotPassword';
import { passwordChangedTemplate } from '../templates/email/passwordChanged';
import { NotificationEvents } from '../constants/notificationEvents';
import type { NotificationEvent, NotificationPayloads } from '../constants/notificationEvents';
import type { Notification } from '../database/models';

type NotificationTypeDb = InferAttributes<Notification>['notification_type'];
type RelatedEntityTypeDb = InferAttributes<Notification>['related_entity_type'];

export interface EmailEventConfig<P> {
    channel: 'EMAIL';
    notificationType: NotificationTypeDb;
    relatedEntityType: RelatedEntityTypeDb;
    to: (payload: P) => string;
    subject: (payload: P) => string;
    html: (payload: P) => string;
    actionUrl: (payload: P) => string | null;
    actionText: (payload: P) => string | null;
    // Sin dbFields el envío no se registra en Notification
    dbFields?: (payload: P) => { clientId: number; companyId: number | null; tenantId: string | null; createdBy: number };
}

/**
 * Config de los eventos que se mandan por email — canal, plantilla y destinatario de cada
 * uno. Un evento nuevo de este canal agrega su entrada acá, nunca en notification.service.ts.
 * `Partial`: no todos los NotificationEvents son necesariamente de email (los de WhatsApp
 * viven en su propio mapa, en whatsappEvents.config.ts).
 */
export const EMAIL_EVENT_CONFIG: Partial<{ [E in NotificationEvent]: EmailEventConfig<NotificationPayloads[E]> }> = {
    [NotificationEvents.COMPANY_PENDING_PAYMENT]: {
        channel: 'EMAIL',
        notificationType: 'WELCOME',
        relatedEntityType: 'FACILITY',
        to: (p) => p.ownerEmail,
        subject: (p) => `Activa tu empresa ${p.companyName} en Booking Sport`,
        html: (p) => companyPendingPaymentTemplate({ ownerName: p.ownerName, companyName: p.companyName, planName: p.planName, paymentUrl: p.paymentUrl }),
        actionUrl: (p) => p.paymentUrl,
        actionText: () => 'Activar mi empresa',
        dbFields: (p) => ({ clientId: p.ownerId, companyId: p.companyId, tenantId: p.tenantId, createdBy: p.createdBy }),
    },
    [NotificationEvents.COMPANY_REGISTERED]: {
        channel: 'EMAIL',
        notificationType: 'WELCOME',
        relatedEntityType: 'FACILITY',
        to: (p) => p.ownerEmail,
        subject: (p) => `¡Bienvenido a Booking Sport! Tu empresa ${p.companyName} ya está activa`,
        html: (p) => companyRegisteredTemplate({
            ownerName: p.ownerName,
            companyName: p.companyName,
            planName: p.planName,
            adminPanelUrl: process.env.FRONT_ADMIN_BOOKING || 'http://localhost:3000',
        }),
        actionUrl: () => null,
        actionText: () => null,
        dbFields: (p) => ({ clientId: p.ownerId, companyId: p.companyId, tenantId: p.tenantId, createdBy: p.createdBy }),
    },
    [NotificationEvents.FORGOT_PASSWORD]: {
        channel: 'EMAIL',
        notificationType: 'PASSWORD_RESET',
        relatedEntityType: 'USER',
        to: (p) => p.email,
        subject: () => 'Recupera tu contraseña de Booking Sport',
        html: (p) => forgotPasswordTemplate({ name: p.name, resetUrl: p.resetUrl, expiresInMinutes: p.expiresInMinutes }),
        actionUrl: () => null,
        actionText: () => null,
    },
    [NotificationEvents.PASSWORD_CHANGED]: {
        channel: 'EMAIL',
        notificationType: 'PASSWORD_RESET',
        relatedEntityType: 'USER',
        to: (p) => p.email,
        subject: () => 'Tu contraseña de Booking Sport fue cambiada',
        html: (p) => passwordChangedTemplate({ name: p.name, loginUrl: p.loginUrl }),
        actionUrl: () => null,
        actionText: () => null,
    },
};
