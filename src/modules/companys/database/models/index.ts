/**
 * Índice de modelos del módulo `companys`.
 * Centraliza la importación de todos los modelos del módulo y configura
 * las asociaciones, tanto internas como hacia `users` y `system` — ninguno
 * de los dos importa `companys` de vuelta. Es también el único lugar donde
 * User (users), Company/Space (companys) y Media (system) están todos
 * disponibles a la vez, así que acá se resuelve el lado belongsTo de Media.
 */
import { User, UserFavorite, UserCompany } from '../../../users/database/models';
import { Country, Ubigeo, PaymentType, SurfaceType, SportType, SportCategory, Media, associateMedia } from '../../../system/database/models';
import { Company, associateCompany } from './Company';
import { Space, associateSpace } from './Space';
import { BusinessHour, associateBusinessHour } from './BusinessHour';
import { Configuration, associateConfiguration } from './Configuration';
import { ConfigurationPayment, associateConfigurationPayment } from './ConfigurationPayment';
import { PaymentAccount, associatePaymentAccount } from './PaymentAccount';
import { Rating, associateRating } from './Rating';
import { MercadoPagoCredential, associateMercadoPagoCredential } from './MercadoPagoCredential';

export { Company, Space, BusinessHour, Configuration, ConfigurationPayment, PaymentAccount, Rating, MercadoPagoCredential };

associateCompany({ User, UserFavorite, UserCompany, Space, Configuration, ConfigurationPayment, Rating, Country, Ubigeo, Media });
associateSpace({ User, Company, BusinessHour, SurfaceType, SportType, SportCategory, Media });
associateBusinessHour({ Space });
associateConfiguration({ Company, User });
associateConfigurationPayment({ Company, User, PaymentAccount, PaymentType });
associatePaymentAccount({ Company, User, ConfigurationPayment, PaymentType });
associateRating({ User, Company });
associateMercadoPagoCredential({ Company, User });
associateMedia({ User, Company, Space });
