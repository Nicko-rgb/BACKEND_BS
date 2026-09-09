import { Op } from 'sequelize';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Role } from '../database/models';

// Todos los roles, activos e inactivos — catálogo chico (5 hoy), sin paginar. El front filtra por
// isActive del lado suyo cuando solo necesita los activos (ej. checkboxes de CreateEditMenuItem).
export const findAll = async () => {
    return Role.findAll({ order: [['scope_level', 'ASC'], ['key', 'ASC']] });
};

// Busca por PK — usado antes de update para confirmar existencia.
export const findById = async (id: number) => {
    return Role.findByPk(id);
};

// Busca por key — usado por el login/resolver de autorización y por el backfill de asignaciones.
export const findByKey = async (key: string) => {
    return Role.findOne({ where: { key } });
};

// Busca varias por id a la vez — usado para validar, en bloque, que un conjunto de role_ids
// exista antes de asignarlos a un ítem de menú.
export const findByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];
    return Role.findAll({ where: { role_id: { [Op.in]: ids } } });
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (role: Role, data: Partial<InferAttributes<Role>>) => {
    return role.update(data);
};

// Crea un rol nuevo.
export const create = async (data: InferCreationAttributes<Role>) => {
    return Role.create(data);
};

// Elimina el rol ya cargado — sus role_permission/role_menu_item se borran en cascada a nivel de
// BD (FK ON DELETE CASCADE); si algún usuario todavía tiene este role_id, Postgres rechaza el
// delete por el FK RESTRICT de dsg_bss_user.role_id (el service ya valida esto antes, con un
// mensaje más claro que el error crudo de la constraint).
export const remove = async (role: Role) => {
    await role.destroy();
};
