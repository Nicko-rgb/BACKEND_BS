import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { Media } from '../database/models';

export const findByPublicId = async (publicId: string) => {
    return Media.findOne({ where: { public_id: publicId } });
};

export const findByMedible = async (medibleId: number, medibleType: string) => {
    return Media.findAll({
        where: { medible_id: medibleId, medible_type: medibleType },
        order: [['is_primary', 'DESC'], ['created_at', 'DESC']],
    });
};

// Archivos de un (medible, categoría) — ej. la galería de un espacio. A diferencia
// de findByMedible, no trae los de otras categorías (portada, perfil...).
export const findByMedibleAndCategory = async (medibleId: number, medibleType: string, category: string) => {
    return Media.findAll({
        where: { medible_id: medibleId, medible_type: medibleType, category },
        order: [['created_at', 'DESC']],
    });
};

// Primaria de un (medible, categoría) — ej. el banner actual de una sucursal.
// Solo hay una por grupo (ver unsetPrimary).
export const findPrimary = async (medibleId: number, medibleType: string, category: string, transaction?: Transaction) => {
    return Media.findOne({
        where: { medible_id: medibleId, medible_type: medibleType, category, is_primary: true },
        transaction,
    });
};

// Desmarca las principales del mismo (medible, categoría) — solo una primaria por grupo.
export const unsetPrimary = async (medibleId: number, medibleType: string, category: string, transaction?: Transaction) => {
    return Media.update(
        { is_primary: false },
        { where: { medible_id: medibleId, medible_type: medibleType, category, is_primary: true }, transaction }
    );
};

export const create = async (data: CreationAttributes<Media>, transaction?: Transaction) => {
    return Media.create(data, { transaction });
};

export const update = async (media: Media, data: Partial<InferAttributes<Media>>, transaction?: Transaction) => {
    return media.update(data, { transaction });
};

export const remove = async (media: Media, transaction?: Transaction) => {
    return media.destroy({ transaction });
};
