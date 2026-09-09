/**
 * Archivo principal de modelos del módulo `users`.
 * Centraliza la importación de todos los modelos y establece sus relaciones.
 *
 * NOTA: las asociaciones hacia `companys` (Company, Space) se resuelven desde
 * `companys/database/models/index.ts`, no acá — `users` no puede importar
 * `companys` sin crear una dependencia circular (companys ya importa users).
 * Sí puede consumir `system` (Country, PaymentType, Ubigeo, Media), que no
 * importa `users` de vuelta.
 */
import { User, associateUser } from './User';
import { Person, associatePerson } from './Person';
import { UserFavorite, associateUserFavorite } from './UserFavorite';
import { UserCompany, associateUserCompany } from './UserCompany';
import { UserPermission, associateUserPermission } from './UserPermission';
import { UserPageTour, associateUserPageTour } from './UserPageTour';
import { Country, PaymentType, Ubigeo, Media, Role } from '../../../system/database/models';

export { User, Person, UserFavorite, UserCompany, UserPermission, UserPageTour };

associateUser({ Person, UserFavorite, UserCompany, UserPermission, UserPageTour, Media, Role });
associatePerson({ User, Country, PaymentType, Ubigeo });
associateUserFavorite({ User });
associateUserCompany({ User });
associateUserPermission({ User });
associateUserPageTour({ User });
