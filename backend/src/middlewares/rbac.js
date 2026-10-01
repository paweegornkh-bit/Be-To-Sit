import { ApiError } from '../utils/ApiError.js';

export const PERMISSIONS = {
  CUSTOMER:      ['reservation:create', 'reservation:read:own', 'reservation:update:own',
                  'reservation:delete:own', 'menu:read', 'payment:create', 'review:create'],
  STAFF_HOST:    ['reservation:*', 'menu:read', 'table:manage', 'payment:read'],
  STAFF_FINANCE: ['reservation:read', 'menu:read', 'payment:*', 'report:finance', 'expense:create'],
  STAFF_STOCK:   ['reservation:read', 'menu:read', 'ingredient:*', 'stock:*', 'expense:create'],
  MANAGER:       ['reservation:*', 'menu:*', 'table:manage', 'payment:read',
                  'ingredient:read', 'stock:read', 'report:*', 'promotion:create'],
  OWNER:         ['*']
};

const matches = (granted, needed) => {
  if (granted === '*') return true;
  if (granted === needed) return true;
  if (granted.endsWith(':*')) return needed.startsWith(granted.slice(0, -1));
  return false;
};

export const can = (role, permission) =>
  (PERMISSIONS[role] || []).some((g) => matches(g, permission));

export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('กรุณาเข้าสู่ระบบ'));
  if (!can(req.user.role, permission)) {
    return next(ApiError.forbidden('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'));
  }
  next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(ApiError.forbidden('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'));
  }
  next();
};
