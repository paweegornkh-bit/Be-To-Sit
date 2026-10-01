import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { fileStorage } from '../services/fileStorage.service.js';

export const detectImage = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: 'png', contentType: 'image/png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
};

// Builds an Express middleware that accepts a single image file under `fieldName`,
// stores it in uploads/<subdir>/, and normalizes multer errors into ApiError.
const makeUploader = (subdir, fieldName, maxMb = 3) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024 }
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) {
        if (!req.file) return next();
        const detected = detectImage(req.file.buffer);
        if (!detected) {
          return next(ApiError.badRequest('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น'));
        }
        fileStorage.save({
          buffer: req.file.buffer,
          subdir,
          extension: detected.extension,
          contentType: detected.contentType
        }).then(({ key, contentType }) => {
          req.file.storageKey = key;
          req.file.detectedContentType = contentType;
          next();
        }).catch(next);
        return;
      }
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
