import rateLimit from 'express-rate-limit';

const build = (windowMs, max, message) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message } }
});

export const apiLimiter   = build(5 * 60_000, 500, 'มีคำขอมากเกินไป กรุณาลองใหม่ภายหลัง');
export const authLimiter  = build(1 * 60_000, 50,  'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่');
export const writeLimiter = build(60_000, 60, 'ส่งข้อมูลถี่เกินไป กรุณารอสักครู่');
