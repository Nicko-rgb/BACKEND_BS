import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: { description: 'Una cuenta manual por sucursal y tipo', module: 'companys', order: 54 },
    async up(queryInterface, sequelize, transaction) {
        // No elegir ni eliminar cuentas existentes de forma automática.
        await sequelize.query('LOCK TABLE dsg_bss_payment_account IN SHARE ROW EXCLUSIVE MODE', { transaction });
        const [duplicates] = await sequelize.query(`
            SELECT sucursal_id, payment_type_id FROM dsg_bss_payment_account
            GROUP BY sucursal_id, payment_type_id HAVING COUNT(*) > 1 LIMIT 1
        `, { transaction });
        if (duplicates.length) {
            throw new Error('Existen cuentas duplicadas por sucursal y tipo. Resolverlas antes de aplicar 054_unique_payment_account. No se eliminó ningún dato.');
        }
        await queryInterface.addIndex('dsg_bss_payment_account', ['sucursal_id', 'payment_type_id'], {
            unique: true, name: 'unique_payment_account_sucursal_type', transaction,
        });
    },
    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.removeIndex('dsg_bss_payment_account', 'unique_payment_account_sucursal_type', { transaction });
    },
};
module.exports = migration;
