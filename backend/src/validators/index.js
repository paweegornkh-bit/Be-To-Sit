import { z } from 'zod';

const password = z.string().min(8, 'รหัสผ่านอย่างน้อย 8 ตัวอักษร')
  .regex(/[A-Za-z]/, 'ต้องมีตัวอักษร').regex(/\d/, 'ต้องมีตัวเลข');

export const registerSchema = z.object({
  email:    z.string().email('อีเมลไม่ถูกต้อง').toLowerCase(),
  password,
  fullName: z.string().min(2).max(100),
  phone:    z.string().regex(/^0\d{9}$/, 'เบอร์โทรต้องเป็น 10 หลักขึ้นต้นด้วย 0')
}).strict();

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1)
}).strict();

export const createReservationSchema = z.object({
  tableId:     z.string().uuid('รหัสโต๊ะไม่ถูกต้อง'),
  reserveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD'),
  timeSlot:    z.enum(['11:00', '13:00', '17:00', '19:00', '21:00']),
  partySize:   z.coerce.number().int().min(1).max(20),
  note:        z.string().max(200).optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    qty: z.coerce.number().int().min(1).max(50)
  })).max(30).optional().default([])
}).strict();

export const updateReservationStatusSchema = z.object({
  status: z.enum(['PENDING','CONFIRMED','SEATED','COMPLETED','CANCELLED','NO_SHOW'])
}).strict();

export const menuItemSchema = z.object({
  categoryId:  z.string().uuid(),
  name:        z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  price:       z.coerce.number().positive().max(99999),
  imageUrl:    z.string().url().optional(),
  isAvailable: z.boolean().optional().default(true)
}).strict();

export const paymentSchema = z.object({
  reservationId: z.string().uuid(),
  method: z.enum(['PROMPTPAY','CREDIT_CARD','CASH','TRANSFER'])
}).strict();

export const ingredientSchema = z.object({
  name:         z.string().min(2).max(100),
  unit:         z.string().min(1).max(20),
  stockQty:     z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0)
}).strict();

export const stockMovementSchema = z.object({
  ingredientId: z.string().uuid(),
  type: z.enum(['IN','OUT','ADJUST']),
  qty:  z.coerce.number().positive(),
  note: z.string().max(200).optional()
}).strict();

export const tablePositionSchema = z.object({
  posX: z.coerce.number().min(0).max(5000),
  posY: z.coerce.number().min(0).max(5000)
}).strict();

export const reviewSchema = z.object({
  reservationId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
}).strict();
