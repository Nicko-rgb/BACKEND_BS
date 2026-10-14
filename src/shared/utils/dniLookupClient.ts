import logger from '../../config/logger';
import { toErrorMessage } from './errorUtils';

const DNI_API_URL = process.env.DNI_LOOKUP_API_URL;

export interface DniLookupResult {
    name: string;
    lastName: string;
}

/**
 * Consulta nombre/apellidos por número de documento en el servicio externo
 * (Perú). Nunca lanza — retorna null si falla, no responde ok, o no
 * encuentra el documento; el caller decide el mensaje de negocio.
 */
export const lookupByDni = async (documentNumber: string): Promise<DniLookupResult | null> => {
    try {
        const response = await fetch(`${DNI_API_URL}/${documentNumber}`);
        if (!response.ok) return null;

        // El shape lo define el servicio externo — se valida acá en el borde.
        const data = (await response.json()) as {
            success?: unknown;
            result?: { name?: unknown; paternal?: unknown; maternal?: unknown };
        };
        const result = data.result;
        if (!data.success || !result || typeof result.name !== 'string') return null;

        const paternal = typeof result.paternal === 'string' ? result.paternal : '';
        const maternal = typeof result.maternal === 'string' ? result.maternal : '';
        return {
            name: result.name,
            lastName: `${paternal} ${maternal}`.trim(),
        };
    } catch (err: unknown) {
        logger.error('[dniLookupClient] Error consultando DNI', { error: toErrorMessage(err) });
        return null;
    }
};
