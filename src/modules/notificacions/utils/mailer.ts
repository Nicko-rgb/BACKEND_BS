import { Resend } from 'resend';
import logger from '../../../config/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
}

/**
 * Envía un email vía Resend. Sin `RESEND_API_KEY` configurada, simula el envío (modo dev) y
 * lo deja en el log en vez de fallar.
 */
export const sendMail = async ({ to, subject, html }: SendMailOptions): Promise<void> => {
    if (!process.env.RESEND_API_KEY) {
        logger.warn(`[mailer] Resend no configurado — email simulado. Para: ${to} | Asunto: ${subject}`);
        return;
    }

    const { data, error } = await resend.emails.send({
        from: process.env.MAIL_FROM || 'Booking Sport <onboarding@resend.dev>',
        to,
        subject,
        html,
    });

    if (error) {
        logger.error(`[mailer] Error enviando a ${to}`, { error: error.message });
        throw new Error(error.message);
    }

    logger.info(`[mailer] Enviado: ${data?.id} → ${to}`);
};
