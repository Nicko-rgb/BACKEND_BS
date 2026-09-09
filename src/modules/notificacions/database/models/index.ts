/**
 * Índice de modelos del módulo `notificacions`.
 * Centraliza la importación del modelo y sus asociaciones hacia `users`
 * y `companys` — ninguno de los dos importa `notificacions` de vuelta.
 */
import { User } from '../../../users/database/models';
import { Company } from '../../../companys/database/models';
import { Notification, associateNotification } from './Notification';

export { Notification };

associateNotification({ User, Company });

// Lado inverso de la asociación definida en `companys` — se wirea acá y no
// allá porque `companys` no puede importar `notificacions` sin crear una
// dependencia circular (notificacions ya importa companys arriba).
Company.hasMany(Notification, { foreignKey: 'company_id', as: 'notifications' });
