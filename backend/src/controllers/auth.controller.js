import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { writeAudit } from '../utils/audit.js';
import { env } from '../config/env.js';

const cookieOpts = {
  httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 3600_000, path: '/api/v1/auth'
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { refreshToken, ...rest } = await authService.register(req.body);
    res.cookie('refreshToken', refreshToken, cookieOpts);
    await writeAudit({ userId: rest.user.id, action: 'REGISTER', entity: 'User',
                       entityId: rest.user.id, ip: req.ip });
    created(res, rest);
  }),

  login: asyncHandler(async (req, res) => {
    const { refreshToken, ...rest } = await authService.login(req.body);
    res.cookie('refreshToken', refreshToken, cookieOpts);
    await writeAudit({ userId: rest.user.id, action: 'LOGIN', entity: 'User',
                       entityId: rest.user.id, ip: req.ip });
    ok(res, rest);
  }),

  refresh: asyncHandler(async (req, res) => {
    const { refreshToken, ...rest } = await authService.refresh(req.cookies?.refreshToken);
    res.cookie('refreshToken', refreshToken, cookieOpts);
    ok(res, rest);
  }),

  logout: asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    ok(res, { message: 'ออกจากระบบเรียบร้อย' });
  }),

  me: asyncHandler(async (req, res) => ok(res, req.user))
};
