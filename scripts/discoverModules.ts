/**
 * discoverModules.ts
 * Descubre dinámicamente los módulos de negocio en src/modules/ — cada
 * subcarpeta es un módulo.
 *
 * Reemplaza al viejo moduleOrder.ts: el orden de EJECUCIÓN de migraciones y
 * seeders lo decide meta.order/config.order (global, no por carpeta), así
 * que no hace falta mantener a mano una lista de módulos — solo saber qué
 * carpetas existen para escanearlas.
 */
import fs from 'fs';
import path from 'path';

const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

export function discoverModuleNames(): string[] {
    return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
}
