import logger from '../../config/logger';

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

        const data: any = await response.json();
        if (!data.success || !data.result?.name) return null;

        return {
            name: data.result.name,
            lastName: `${data.result.paternal || ''} ${data.result.maternal || ''}`.trim(),
        };
    } catch (err: any) {
        logger.error('[dniLookupClient] Error consultando DNI', { error: err.message });
        return null;
    }
};
