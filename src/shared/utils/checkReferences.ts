import { QueryTypes } from 'sequelize';
import sequelize from '../../config/db';

export interface ReferenceCheck {
    table: string;
    column: string;
}

/**
 * Cuenta, para cada id de `ids`, cuántas filas de las tablas relacionadas lo
 * referencian — una sola query agrupada (`GROUP BY`) por tabla relacionada
 * para toda la lista de ids, nunca una query por fila (evita N+1 en listados
 * paginados). Sirve tanto para bloquear un delete (count > 0) como para
 * mostrar el total de referencias en el listado. `ids` acepta tanto ids
 * numéricos como keys de texto (ej. permission.key).
 *
 * Existe porque `system` no puede importar modelos de `companys`/`bookings`/
 * `users`/`saas` (dependencia circular — esos módulos importan `system`), así
 * que el conteo cruza módulos solo con el nombre de tabla/columna real.
 * `table`/`column` siempre vienen de constantes definidas en el repository,
 * nunca de input del usuario.
 */
export const countReferences = async <T extends string | number>(checks: ReferenceCheck[], ids: T[]): Promise<Record<T, number>> => {
    const counts = {} as Record<T, number>;
    ids.forEach((id) => { counts[id] = 0; });
    if (ids.length === 0 || checks.length === 0) return counts;

    for (const { table, column } of checks) {
        const rows = await sequelize.query<{ ref_id: T; count: number }>(
            `SELECT ${column} AS ref_id, COUNT(*)::int AS count FROM ${table} WHERE ${column} IN (:ids) GROUP BY ${column}`,
            { replacements: { ids }, type: QueryTypes.SELECT }
        );
        rows.forEach((row) => {
            counts[row.ref_id] = (counts[row.ref_id] ?? 0) + row.count;
        });
    }

    return counts;
};
