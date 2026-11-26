/**
 * uploadMiddleware — Multer con destino dinamico por fieldname
 *
 * Un nivel por entidad (sin subcarpetas por tipo):
 *   logo, banner, main_image  -> uploads/companys/company/
 *   cover (portada de sucursal) -> uploads/companys/sucursal/
 *   yape_qr, plin_qr, qr_image -> uploads/companys/accounts/
 *   account_qr                   -> uploads/companys/accounts/
 *   payment_proof              -> uploads/bookings/proof/
 *   media  (galeria de Space)  -> uploads/companys/spaces/
 *   document                   -> uploads/docs/
 *   * (desconocido)           -> uploads/misc/
 *
 * Exporta ademas buildFileUrl(file) para construir la ruta /uploads/...
 */
import multer from 'multer';
import type { RequestHandler } from 'express';
import { BadRequestError } from '../errors/CustomErrors';
import { idPublicId } from '../utils/ids';
import path from 'path';
import fs from 'fs';

// Para imágenes verificadas, la extensión y la firma provienen del formato admitido.
const imageFormats = new Map([
    ['image/png', { extension: '.png', matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) }],
    ['image/jpeg', { extension: '.jpg', matches: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) }],
    ['image/webp', { extension: '.webp', matches: (b: Buffer) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' }],
]);

interface FieldDestination {
    formats?: typeof imageFormats;
    maxSizeMB?: number;
    maxFields?: number;
    folder: string;
    sub: string | null;
}

// Mapa fieldname -> destino (sub: '' = plano, sin subcarpeta; null = detectar por mimetype)
const FIELD_DEST: Record<string, FieldDestination> = {
    logo: { folder: 'companys', sub: 'company' },
    banner: { folder: 'companys', sub: 'company' },
    main_image: { folder: 'companys', sub: 'company' },
    cover: { folder: 'companys', sub: 'sucursal' },
    account_qr: { folder: 'companys', sub: 'accounts', formats: imageFormats, maxSizeMB: 5, maxFields: 5 },
    yape_qr: { folder: 'companys', sub: 'accounts' },
    plin_qr: { folder: 'companys', sub: 'accounts' },
    qr_image: { folder: 'companys', sub: 'accounts' },
    payment_proof: { folder: 'bookings', sub: 'proof' },
    media: { folder: 'companys', sub: 'spaces' },
    document: { folder: 'docs', sub: '' },
};

const resolveDestination = (file: Express.Multer.File): { folder: string; sub: string | null } => {
    const dest = FIELD_DEST[file.fieldname];
    if (!dest) {
        return { folder: 'misc', sub: file.mimetype.startsWith('video/') ? 'video' : 'img' };
    }
    if (dest.sub === null) {
        return { folder: dest.folder, sub: file.mimetype.startsWith('video/') ? 'video' : 'img' };
    }
    return { folder: dest.folder, sub: dest.sub };
};

const uploadDirectory = (file: Express.Multer.File) => {
    const { folder, sub } = resolveDestination(file);
    return path.join(__dirname, '../../../uploads', folder, sub ?? '');
};

const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const directory = uploadDirectory(file);
        fs.mkdir(directory, { recursive: true }, (err) => cb(err, directory));
    },
    filename: (_req, file, cb) => {
        const extension = FIELD_DEST[file.fieldname]?.formats?.get(file.mimetype)?.extension
            ?? path.extname(file.originalname).toLowerCase();
        cb(null, `media-${idPublicId()}${extension}`);
    },
});

// Tipos MIME permitidos
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const upload = {
    single(field: string): RequestHandler {
        const { formats, maxSizeMB = 50, maxFields } = FIELD_DEST[field] ?? {};
        const parse = multer({
            storage,
            // Busboy dispara el error al alcanzar el umbral; el máximo anunciado es inclusivo.
            limits: { fileSize: maxSizeMB * 1024 * 1024 + 1, fields: maxFields },
            fileFilter: (_req, file, cb) => {
                const allowedTypes = formats ? [...formats.keys()] : ALLOWED_TYPES;
                if (!allowedTypes.includes(file.mimetype)) {
                    return cb(new BadRequestError(`Formato de archivo no permitido`));
                }
                cb(null, true);
            },
        }).single(field);

        return (req, res, next) => {
            parse(req, res, async (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        return next(new BadRequestError(err.code === 'LIMIT_FILE_SIZE'
                            ? `El archivo no puede superar ${maxSizeMB} MB` : err.message));
                    }
                    return next(err);
                }
                const file = req.file;
                if (!file || !formats) return next();
                try {
                    const header = Buffer.alloc(12);
                    const handle = await fs.promises.open(file.path, 'r');
                    let bytesRead;
                    try {
                        ({ bytesRead } = await handle.read(header));
                    } finally {
                        await handle.close();
                    }
                    if (!formats.get(file.mimetype)?.matches(header.subarray(0, bytesRead))) {
                        throw new BadRequestError('El contenido del archivo no coincide con el formato indicado');
                    }
                    file.originalname = file.originalname.slice(0, 255);
                } catch (error) {
                    try {
                        await fs.promises.rm(file.path, { force: true });
                    } catch (cleanupError) {
                        return next(cleanupError);
                    }
                    return next(error);
                }
                next();
            });
        };
    },
};

/**
 * Construye la URL relativa a partir del objeto file de multer.
 * Ej: /uploads/companys/accounts/media-1234.jpg
 */
export const buildFileUrl = (file: Express.Multer.File | null | undefined): string | null => {
    if (!file) return null;
    const { folder, sub } = resolveDestination(file);
    return sub
        ? '/uploads/' + folder + '/' + sub + '/' + file.filename
        : '/uploads/' + folder + '/' + file.filename;
};

export default upload;
