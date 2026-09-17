import { sendMail } from '../utils/mailer';
import * as NotificationRepository from '../repository/notification.repository';
import { EMAIL_EVENT_CONFIG } from './emailEvents.config';
import type { NotificationEvent, NotificationPayloads } from '../constants/notificationEvents';
import logger from '../../../config/logger';

/**
 * Punto de entrada único para mandar cualquier notificación — el caller solo indica el
 * evento y su data. Acá se busca la config del evento en el mapa de su canal
 * (`EMAIL_EVENT_CONFIG` hoy, un `WHATSAPP_EVENT_CONFIG` análogo a futuro), se manda por el
 * cliente que corresponda y, si el evento define `dbFields`, se deja el registro en `Notification` —
 * con `delivery_status: 'FAILED'` si el envío no salió, nunca lanza por eso. Devuelve si el envío salió.
 */
export const notify = async <E extends NotificationEvent>(event: E, payload: NotificationPayloads[E]): Promise<boolean> => {
    const emailConfig = EMAIL_EVENT_CONFIG[event];

    if (!emailConfig) {
        logger.error(`[NotificationService] Evento sin config de ningún canal: ${event}`);
        return false;
    }

    let deliveryStatus: 'SENT' | 'FAILED' = 'SENT';
    try {
        await sendMail({ to: emailConfig.to(payload), subject: emailConfig.subject(payload), html: emailConfig.html(payload) });
    } catch (err) {
        logger.error(`[NotificationService] Error enviando evento ${event}`, { error: err });
        deliveryStatus = 'FAILED';
    }

    const isSent = deliveryStatus === 'SENT';
    const dbFields = emailConfig.dbFields?.(payload);
    if (!dbFields) return isSent;

    const subject = emailConfig.subject(payload);

    await NotificationRepository.create({
        client_id: dbFields.clientId,
        company_id: dbFields.companyId,
        tenant_id: dbFields.tenantId,
        title: subject,
        message: subject,
        notification_type: emailConfig.notificationType,
        channel: emailConfig.channel,
        related_entity_type: emailConfig.relatedEntityType,
        related_entity_id: dbFields.companyId,
        action_url: emailConfig.actionUrl(payload),
        action_text: emailConfig.actionText(payload),
        delivery_status: deliveryStatus,
        sent_at: isSent ? new Date() : null,
        user_create: dbFields.createdBy,
    });

    return isSent;
};
