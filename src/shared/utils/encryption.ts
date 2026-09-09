/**
 * Utilidad de encriptación simétrica (AES-256-GCM) para credenciales
 * sensibles que deben persistir en BD (ej: access tokens de Mercado Pago).
 *
 * La clave se deriva por hash de MP_CREDENTIALS_ENCRYPTION_KEY, así el valor
 * en .env puede ser cualquier longitud/formato y siempre resulta en 32 bytes.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // largo recomendado de IV para GCM

const getKey = (): Buffer => {
    const rawKey = process.env.MP_CREDENTIALS_ENCRYPTION_KEY;
    if (!rawKey) {
        throw new Error('MP_CREDENTIALS_ENCRYPTION_KEY no está configurada en el entorno');
    }
    return crypto.createHash('sha256').update(rawKey).digest();
};

/**
 * Encripta un texto plano. Retorna un string serializado "iv:authTag:data"
 * en base64, listo para guardar en una columna TEXT.
 */
export const encrypt = (plainText: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Revierte encrypt(). Lanza si el payload fue alterado (falla la verificación
 * del authTag) o si la clave no coincide con la usada al encriptar.
 */
export const decrypt = (payload: string): string => {
    const [ivB64, tagB64, dataB64] = String(payload).split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error('Payload encriptado con formato inválido');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
};
