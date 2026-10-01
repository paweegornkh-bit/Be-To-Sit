import dotenv from 'dotenv';
dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`❌ Missing env variable: ${key}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const storageDriver = process.env.STORAGE_DRIVER || (nodeEnv === 'production' ? 'cloudinary' : 'local');
if (nodeEnv === 'production' &&
    (process.env.JWT_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32)) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production');
}
if (!['local', 'cloudinary'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER must be either local or cloudinary');
}
if (storageDriver === 'cloudinary' &&
    (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
  throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for Cloudinary storage');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  corsOrigin: (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  authMaxFailed: Number(process.env.AUTH_MAX_FAILED) || 5,
  authLockMinutes: Number(process.env.AUTH_LOCK_MINUTES) || 15,
  depositRate: Number(process.env.DEPOSIT_RATE) || 0.2,
  isProd: nodeEnv === 'production',
  storageDriver,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
};
