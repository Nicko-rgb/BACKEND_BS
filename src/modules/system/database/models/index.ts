/**
 * Índice de modelos del módulo `system`.
 * Centraliza los catálogos generales usados por múltiples módulos:
 * geografía (Country/Department/Province/District/Ubigeo), medios (Media),
 * tipos de pago (PaymentType), catálogos deportivos (SportType/SportCategory/
 * SurfaceType) y permisos/menú (Permission/MenuItem).
 *
 * Las asociaciones hacia `users` y `companys` se resuelven desde el índice
 * de esos módulos, no acá — `system` no puede importarlos sin crear una
 * dependencia circular (ambos importan `system`).
 */
import { Permission } from './Permission';
import { MenuItem } from './MenuItem';
import { Role } from './Role';
import { RolePermission } from './RolePermission';
import { RoleMenuItem } from './RoleMenuItem';
import { Country, associateCountry } from './Country';
import { Department, associateDepartment } from './Department';
import { Province, associateProvince } from './Province';
import { District, associateDistrict } from './District';
import { Ubigeo, associateUbigeo } from './Ubigeo';
import { PaymentType, associatePaymentType } from './PaymentType';
import { SportType } from './SportType';
import { SportCategory } from './SportCategory';
import { SurfaceType } from './SurfaceType';
import { Media, associateMedia } from './Media';
import { MigrationMeta } from './MigrationMeta';
import { SeedMeta, runOnce } from './SeedMeta';

export {
    Permission, MenuItem,
    Role, RolePermission, RoleMenuItem,
    Country, Department, Province, District, Ubigeo,
    PaymentType, SportType, SportCategory, SurfaceType,
    Media, associateMedia,
    MigrationMeta, SeedMeta, runOnce,
};

associateCountry({ Ubigeo, PaymentType });
associateDepartment({ Country, Province });
associateProvince({ Department, District });
associateDistrict({ Province });
associateUbigeo({ Country });
associatePaymentType({ Country });
