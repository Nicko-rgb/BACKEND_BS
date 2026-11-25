import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import type { RequestHandler } from 'express';
import { idPublicId } from '../utils/ids';
import { BadRequestError } from '../errors/CustomErrors';

const MIME_EXT: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 6 },
    fileFilter: (_req, file, callback) => {
        if (MIME_EXT[file.mimetype]) callback(null, true);
        else callback(new BadRequestError('El QR debe ser una imagen PNG, JPG o WebP'));
    },
}).single('account_qr');

// Nada se escribe en disco antes de validar el formulario y el alcance.
export const accountQrUpload: RequestHandler = (req, res, next) => {
    parse(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            next(new BadRequestError(error.code === 'LIMIT_FILE_SIZE'
                ? 'El QR no puede superar 5 MB' : 'Archivo o campos de la cuenta inválidos'));
        } else next(error);
    });
};

export const persistAccountQr = async (file: Express.Multer.File): Promise<Express.Multer.File> => {
    const bytes = file.buffer;
    const isPng = bytes?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = bytes?.[0] === 255 && bytes?.[1] === 216 && bytes?.[2] === 255;
    const isWebp = bytes?.toString('ascii', 0, 4) === 'RIFF' && bytes?.toString('ascii', 8, 12) === 'WEBP';
    const valid = file.mimetype === 'image/png' ? isPng : file.mimetype === 'image/jpeg' ? isJpeg : file.mimetype === 'image/webp' && isWebp;
    if (!valid || !bytes?.length || bytes.length > 5 * 1024 * 1024) {
        throw new BadRequestError('El archivo QR no es una imagen PNG, JPG o WebP válida de hasta 5 MB');
    }
    const destination = path.resolve(__dirname, '../../../uploads/accounts');
    await fs.mkdir(destination, { recursive: true });
    const filename = `qr-${idPublicId()}${MIME_EXT[file.mimetype]}`;
    const diskPath = path.join(destination, filename);
    try { await fs.writeFile(diskPath, bytes, { flag: 'wx' }); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') await fs.unlink(diskPath).catch(() => {});
        throw error;
    }
    return { ...file, fieldname: 'account_qr', destination, filename, path: diskPath, originalname: file.originalname.slice(0, 255) };
};
