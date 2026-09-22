import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 12;
const MAX_FAILED = 20;
const LOCK_MINUTES = 1;

const sign = (user) => ({
  accessToken: jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }),
  refreshToken: jwt.sign({ sub: user.id }, env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn })
});

const publicUser = (u) => ({
  id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role
});

export const authService = {
  async register({ email, password, fullName, phone }) {
    if (await prisma.user.findUnique({ where: { email } })) {
      throw ApiError.conflict('EMAIL_TAKEN', 'อีเมลนี้ถูกใช้งานแล้ว');
    }
    const user = await prisma.user.create({
      data: {
        email, fullName, phone,
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        role: 'CUSTOMER'
      }
    });
    return { user: publicUser(user), ...sign(user) };
  },

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    const generic = ApiError.unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    if (!user) { await bcrypt.hash(password, 4); throw generic; }
    if (!user.isActive) throw ApiError.forbidden('บัญชีนี้ถูกระงับการใช้งาน');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw ApiError.forbidden(`บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ใน ${mins} นาที`);
    }

    if (!await bcrypt.compare(password, user.passwordHash)) {
      const failed = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= MAX_FAILED
            ? new Date(Date.now() + LOCK_MINUTES * 60000) : null
        }
      });
      throw generic;
    }

    await prisma.user.update({
      where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null }
    });
    return { user: publicUser(user), ...sign(user) };
  },

  async refresh(token) {
    if (!token) throw ApiError.unauthorized('ไม่พบ Refresh Token');
    let payload;
    try { payload = jwt.verify(token, env.jwtRefreshSecret); }
    catch { throw ApiError.unauthorized('Refresh Token ไม่ถูกต้องหรือหมดอายุ'); }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive) throw ApiError.unauthorized('บัญชีไม่พร้อมใช้งาน');
    return { user: publicUser(user), ...sign(user) };
  }
};
