import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp'
};

const makeStorage = (subdir) => {
  const dir = path.resolve('uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname) || '';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  });
};

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME[file.mimetype]) {
    return cb(ApiError.badRequest('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น'));
  }
  cb(null, true);
};

// Builds an Express middleware that accepts a single image file under `fieldName`,
// stores it in uploads/<subdir>/, and normalizes multer errors into ApiError.
const makeUploader = (subdir, fieldName, maxMb = 3) => {
  const upload = multer({
    storage: makeStorage(subdir),
    fileFilter,
    limits: { fileSize: maxMb * 1024 * 1024 }
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err.name === 'MulterError') {
        return next(err.code === 'LIMIT_FILE_SIZE'
          ? ApiError.badRequest(`ไฟล์รูปภาพต้องมีขนาดไม่เกิน ${maxMb}MB`)
          : ApiError.badRequest(err.message));
      }
      next(err);
    });
  };
};

export const uploadMenuImage   = makeUploader('menu-items', 'image');
export const uploadPaymentSlip = makeUploader('payment-slips', 'slip', 5);
export const uploadQrImage     = makeUploader('payment-settings', 'image');

export const publicUploadUrl = (subdir, filename) => `/uploads/${subdir}/${filename}`;
