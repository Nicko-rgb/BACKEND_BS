/**
 * uploadMiddleware — Multer con destino dinamico por fieldname
 *
 * Mapa de destinos:
 *   logo, banner, main_image  -> uploads/companys/img/
 *   yape_qr, plin_qr, qr_image -> uploads/companys/qr/
 *   payment_proof              -> uploads/bookings/proof/
 *   media  (galeria de Space)  -> uploads/spaces/img/ o uploads/spaces/video/
 *   document                   -> uploads/docs/
 *   * (desconocido)           -> uploads/misc/
 *
 * Exporta ademas buildFileUrl(file) para construir la ruta /uploads/...
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';

interface FieldDestination {
    folder: string;
    sub: string | null;
}

// Mapa fieldname -> destino  (sub: null = detectar por mimetype)
const FIELD_DEST: Record<string, FieldDestination> = {
    logo: { folder: 'companys', sub: 'img' },
    banner: { folder: 'companys', sub: 'img' },
    main_image: { folder: 'companys', sub: 'img' },
    yape_qr: { folder: 'companys', sub: 'qr' },
    plin_qr: { folder: 'companys', sub: 'qr' },
    qr_image: { folder: 'companys', sub: 'qr' },
    payment_proof: { folder: 'bookings', sub: 'proof' },
    media: { folder: 'spaces', sub: null },
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

// Storage
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const { folder, sub } = resolveDestination(file);
        const uploadPath = sub
            ? path.join(__dirname, '../../../uploads', folder, sub)
            : path.join(__dirname, '../../../uploads', folder);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'media-' + uniqueSuffix + ext);
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

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Formatos: imagenes, videos y documentos.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * Construye la URL relativa a partir del objeto file de multer.
 * Ej: /uploads/companys/qr/media-1234.jpg
 */
export const buildFileUrl = (file: Express.Multer.File | null | undefined): string | null => {
    if (!file) return null;
    const { folder, sub } = resolveDestination(file);
    return sub
        ? '/uploads/' + folder + '/' + sub + '/' + file.filename
        : '/uploads/' + folder + '/' + file.filename;
};

export default upload;
