import fs from 'fs';
import path from 'path';

// verificarPermiso es variádico (exige TODOS los permisos indicados) — matchea la llamada completa
// y después cada literal entre comillas dentro de ella, así cuenta multi-arg (`verificarPermiso('a', 'b')`)
// igual que single-arg. Análisis estático de texto, no ejecuta nada.
const PERMISSION_CALL_PATTERN = /verificarPermiso\(([^)]*)\)/g;
const PERMISSION_KEY_PATTERN = /['"]([a-zA-Z0-9_.]+)['"]/g;

// Recorre recursivamente un directorio buscando archivos *.route.ts.
const findRouteFiles = (dir: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return findRouteFiles(fullPath);
        return entry.name.endsWith('.route.ts') ? [fullPath] : [];
    });
};

// Memo del proceso — las rutas del backend no cambian sin un reinicio (tsx watch reinicia todo
// el proceso ante cualquier cambio), así que escanear el árbol una sola vez por proceso nunca
// queda desactualizado.
let cachedUsage: Record<string, number> | null = null;

/**
 * Cuenta, para cada permission key, en cuántas rutas reales del backend aparece un
 * `verificarPermiso('key')` — análisis estático del código fuente de `src/modules`, no de la
 * base de datos. Sirve para ver qué permisos del catálogo están efectivamente conectados a un
 * endpoint y cuáles solo existen en la tabla sin uso real.
 */
export const countPermissionUsageInRoutes = (): Record<string, number> => {
    if (cachedUsage) return cachedUsage;

    const modulesDir = path.join(__dirname, '..', '..'); // src/modules
    const routeFiles = findRouteFiles(modulesDir);

    const counts: Record<string, number> = {};
    routeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        for (const call of content.matchAll(PERMISSION_CALL_PATTERN)) {
            for (const keyMatch of call[1].matchAll(PERMISSION_KEY_PATTERN)) {
                const key = keyMatch[1];
                counts[key] = (counts[key] ?? 0) + 1;
            }
        }
    });

    cachedUsage = counts;
    return cachedUsage;
};
