import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const uploadRoot = path.resolve('uploads');

if (env.storageDriver === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

const cloudUpload = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
  stream.end(buffer);
});

const safeLocalPath = (relativePath) => {
  const resolved = path.resolve(uploadRoot, relativePath);
  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw ApiError.badRequest('ตำแหน่งไฟล์ไม่ถูกต้อง');
  }
  return resolved;
};

export const fileStorage = {
  async save({ buffer, subdir, extension, contentType }) {
    const filename = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${extension}`;

    if (env.storageDriver === 'local') {
      const relativePath = path.join(subdir, filename);
      const filePath = safeLocalPath(relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer, { flag: 'wx' });
      return { key: `local:${relativePath.replaceAll('\\', '/')}`, contentType };
    }

    const publicId = `tabletime/${subdir}/${filename.slice(0, -extension.length - 1)}`;
    const uploaded = await cloudUpload(buffer, {
      resource_type: 'image', type: 'authenticated',
      public_id: publicId, format: extension, overwrite: false
    });
    return {
      key: `cloudinary:${uploaded.public_id}:${uploaded.version}:${extension}`,
      contentType
    };
  },

  async read(key) {
    if (key.startsWith('local:')) {
      const relativePath = key.slice('local:'.length);
      const extension = path.extname(relativePath).slice(1).toLowerCase();
      return { buffer: await fs.readFile(safeLocalPath(relativePath)), contentType: mimeFor(extension) };
    }

    // รองรับสลิป local ที่บันทึกก่อนเพิ่ม storage adapter
    if (key.startsWith('/uploads/payment-slips/')) {
      const relativePath = key.replace(/^\/uploads\//, '');
      const extension = path.extname(relativePath).slice(1).toLowerCase();
      return { buffer: await fs.readFile(safeLocalPath(relativePath)), contentType: mimeFor(extension) };
    }

    if (key.startsWith('cloudinary:')) {
      const [, publicId, version, extension] = key.split(':');
      if (!publicId || !version || !extension) throw ApiError.notFound('ไม่พบไฟล์สลิป');
      const signedUrl = cloudinary.url(publicId, {
        secure: true, resource_type: 'image', type: 'authenticated',
        sign_url: true, version: Number(version), format: extension
      });
      const response = await fetch(signedUrl);
      if (!response.ok) throw ApiError.notFound('ไม่พบไฟล์สลิป');
      return { buffer: Buffer.from(await response.arrayBuffer()), contentType: mimeFor(extension) };
    }

    throw ApiError.notFound('ไม่พบไฟล์สลิป');
  }
};

function mimeFor(extension) {
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[extension] || 'application/octet-stream';
}