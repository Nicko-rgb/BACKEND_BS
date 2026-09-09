import whatsappConfig from './whatsapp';
import logger from '../../../config/logger';

interface SendTemplateMessageOptions {
    /** número en formato E.164 (ej. "51987654321") */
    to: string;
    /** SID del contenido/plantilla en Twilio (ej. "HX8dc9eea84231541b091557c47cc2a342") */
    contentSid: string;
    /** Variables mapeadas (ej. { "1": "Juan", "2": "Cancha 1" }) */
    contentVariables?: Record<string, string>;
}

/**
 * Envía un mensaje con plantilla por WhatsApp usando la API de Twilio (Content API).
 * Si no hay credenciales configuradas, simula el envío (retorna true).
 */
export const sendTemplateMessage = async ({ to, contentSid, contentVariables = {} }: SendTemplateMessageOptions): Promise<boolean> => {
    if (!whatsappConfig.isConfigured) {
        logger.warn(`[whatsappClient] Twilio no configurado — envío simulado. Para: ${to} | ContentSid: ${contentSid}`);
        return true;
    }

    const { accountSid, authToken, whatsappNumber } = whatsappConfig;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const cleanTo = String(to).replace(/\D/g, '');
    const cleanFrom = String(whatsappNumber).replace(/\D/g, '');

    const formattedTo = `whatsapp:+${cleanTo}`;
    const formattedFrom = `whatsapp:+${cleanFrom}`;

    const bodyParams = new URLSearchParams();
    bodyParams.append('To', formattedTo);
    bodyParams.append('From', formattedFrom);
    bodyParams.append('ContentSid', contentSid);

    if (Object.keys(contentVariables).length > 0) {
        bodyParams.append('ContentVariables', JSON.stringify(contentVariables));
    }

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: bodyParams.toString(),
        });

        const data: any = await response.json();

        if (!response.ok) {
            logger.error(`[whatsappClient] Error enviando a ${formattedTo}`, { error: data.message || data });
            return false;
        }

        logger.info(`[whatsappClient] Enviado por Twilio: ${data.sid} → ${formattedTo}`);
        return true;
    } catch (err: any) {
        logger.error(`[whatsappClient] Error de red enviando a ${formattedTo}`, { error: err.message });
        return false;
    }
};
