import Joi from 'joi';

// UUID v7 canónico — mismo formato que genera idPublicId() (shared/utils/ids.ts).
export const publicIdSchema = Joi.string()
    .uuid({ version: 'uuidv7', separator: '-', wrapper: false });
