/**
 * Único punto de generación de IDs de la app.
 *
 * Los nombres no mencionan versión a propósito: si la estrategia cambia
 * (otra versión de UUID, ULID, etc.), solo se toca este archivo, nunca los
 * consumidores.
 *
 * - `idPublicId()`: identificador público de entidades (public_id, tenant_id,
 *   lead_uuid, req.id). Hoy implementado como UUID v7 = timestamp Unix en ms
 *   (48 bits) + 74 bits aleatorios → IDs ordenados por tiempo (inserts
 *   secuenciales, índices B-tree compactos). Formato:
 *   xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx (versión 7, variante RFC 4122).
 * - `idBooking()`: reservado — códigos cortos únicos para reservas (se define
 *   cuando se construya ese flujo).
 */
import crypto from 'crypto';

export const idPublicId = (): string => {
    const bytes = crypto.randomBytes(16);

    // 48 bits de timestamp (ms) en los primeros 6 bytes ──────────────────────
    const now = BigInt(Date.now());
    bytes[0] = Number((now >> 40n) & 0xffn);
    bytes[1] = Number((now >> 32n) & 0xffn);
    bytes[2] = Number((now >> 24n) & 0xffn);
    bytes[3] = Number((now >> 16n) & 0xffn);
    bytes[4] = Number((now >> 8n) & 0xffn);
    bytes[5] = Number(now & 0xffn);

    // Versión 7 (byte 6, nibble alto) + variante RFC 4122 (byte 8, bits altos 10) ──
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export default idPublicId;
