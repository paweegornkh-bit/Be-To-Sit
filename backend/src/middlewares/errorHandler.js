import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res) => res.status(404).json({
  success: false,
  error: { code: 'NOT_FOUND', message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}` }
});

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) }
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว' }
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลที่ต้องการ' }
    });
  }

  console.error('[UNHANDLED]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'เกิดข้อผิดพลาดภายในระบบ',
      ...(env.isProd ? {} : { debug: err.message })
    }
  });
};
