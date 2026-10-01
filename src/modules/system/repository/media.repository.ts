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
