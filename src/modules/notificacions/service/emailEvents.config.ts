import type { InferAttributes } from 'sequelize';
import { companyPendingPaymentTemplate } from '../templates/email/companyPendingPayment';
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
    dbFields: (payload: P) => { clientId: number; companyId: number; tenantId: string; createdBy: number };
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
};
