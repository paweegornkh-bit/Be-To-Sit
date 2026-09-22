import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw ApiError.unauthorized('กรุณาเข้าสู่ระบบ');

  let payload;
  try { payload = jwt.verify(header.slice(7), env.jwtSecret); }
  catch { throw ApiError.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, role: true, isActive: true }
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('บัญชีถูกระงับ');

  req.user = user;
  next();
});
