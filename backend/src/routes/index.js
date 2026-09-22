import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission, requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter, writeLimiter } from '../middlewares/rateLimit.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created, noContent, paginate } from '../utils/response.js';
import { writeAudit } from '../utils/audit.js';
import * as V from '../validators/index.js';
import { authController } from '../controllers/auth.controller.js';
import { reservationService } from '../services/reservation.service.js';
import { paymentService } from '../services/payment.service.js';
import { reportService } from '../services/report.service.js';

const r = Router();
const CACHE_PUBLIC = (s) => (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${s}`); next();
};
const NO_STORE = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

/* AUTH */
r.post('/auth/register', authLimiter, validate(V.registerSchema), authController.register);
r.post('/auth/login',    authLimiter, validate(V.loginSchema),    authController.login);
r.post('/auth/refresh',  authController.refresh);
r.post('/auth/logout',   authController.logout);
r.get ('/auth/me',       authenticate, authController.me);

/* ZONES & TABLES */
r.get('/zones', CACHE_PUBLIC(3600), asyncHandler(async (_req, res) =>
  ok(res, await prisma.zone.findMany({
    include: { _count: { select: { tables: true } } }, orderBy: { name: 'asc' } }))));

r.get('/tables', CACHE_PUBLIC(60), asyncHandler(async (req, res) => {
  const { zoneId, date, slot } = req.query;
  const tables = await prisma.table.findMany({
    where: { ...(zoneId && { zoneId }) },
    include: { zone: { select: { name: true } } }, orderBy: { tableNo: 'asc' }
  });
  if (!date || !slot) return ok(res, tables);

  const booked = await prisma.reservation.findMany({
    where: { reserveDate: new Date(date), timeSlot: slot,
             status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
    select: { tableId: true }
  });
  const bookedSet = new Set(booked.map((b) => b.tableId));
  ok(res, tables.map((t) => ({
    ...t, isAvailable: !bookedSet.has(t.id) && t.status !== 'MAINTENANCE'
  })));
}));

r.patch('/tables/:id/position', authenticate, requirePermission('table:manage'),
  validate(V.tablePositionSchema), asyncHandler(async (req, res) =>
    ok(res, await prisma.table.update({ where: { id: req.params.id }, data: req.body }))));

r.patch('/tables/:id/status', authenticate, requirePermission('table:manage'),
  asyncHandler(async (req, res) =>
    ok(res, await prisma.table.update({
      where: { id: req.params.id }, data: { status: req.body.status } }))));

/* RESERVATIONS */
r.get('/reservations', authenticate, NO_STORE, asyncHandler(async (req, res) => {
  const pg = paginate(req.query);
  const { rows, meta } = await reservationService.list({ ...req.query, ...pg, user: req.user });
  ok(res, rows, meta);
}));

r.get('/reservations/:id', authenticate, NO_STORE, asyncHandler(async (req, res) =>
  ok(res, await reservationService.getById(req.params.id, req.user))));

r.post('/reservations', authenticate, writeLimiter,
  requirePermission('reservation:create'), validate(V.createReservationSchema),
  asyncHandler(async (req, res) => {
    const data = await reservationService.create(req.body, req.user);
    await writeAudit({ userId: req.user.id, action: 'CREATE', entity: 'Reservation',
                       entityId: data.id, ip: req.ip });
    created(res, data);
  }));

r.put('/reservations/:id', authenticate, validate(V.createReservationSchema),
  asyncHandler(async (req, res) => {
    await reservationService.cancel(req.params.id, req.user);
    created(res, await reservationService.create(req.body, req.user));
  }));

r.patch('/reservations/:id/status', authenticate,
  requirePermission('reservation:update'), validate(V.updateReservationStatusSchema),
  asyncHandler(async (req, res) => {
    const data = await reservationService.updateStatus(req.params.id, req.body.status, req.user);
    await writeAudit({ userId: req.user.id, action: `STATUS_${req.body.status}`,
                       entity: 'Reservation', entityId: data.id, ip: req.ip });
    ok(res, data);
  }));

r.delete('/reservations/:id', authenticate, asyncHandler(async (req, res) => {
  await reservationService.cancel(req.params.id, req.user);
  await writeAudit({ userId: req.user.id, action: 'CANCEL', entity: 'Reservation',
                     entityId: req.params.id, ip: req.ip });
  noContent(res);
}));

/* MENU */
r.get('/menu-categories', CACHE_PUBLIC(3600), asyncHandler(async (_req, res) =>
  ok(res, await prisma.menuCategory.findMany({ orderBy: { name: 'asc' } }))));

r.get('/menu-items', CACHE_PUBLIC(600), asyncHandler(async (req, res) => {
  const { categoryId, q } = req.query;
  const pg = paginate(req.query);
  const where = {
    isDeleted: false,
    ...(categoryId && { categoryId }),
    ...(q && { name: { contains: q, mode: 'insensitive' } })
  };
  const [rows, total] = await Promise.all([
    prisma.menuItem.findMany({ where, include: { category: { select: { name: true } } },
                               skip: pg.skip, take: pg.take, orderBy: { name: 'asc' } }),
    prisma.menuItem.count({ where })
  ]);
  ok(res, rows, { page: pg.page, limit: pg.limit, total });
}));

r.get('/menu-items/:id', CACHE_PUBLIC(600), asyncHandler(async (req, res) =>
  ok(res, await prisma.menuItem.findFirstOrThrow({
    where: { id: req.params.id, isDeleted: false },
    include: { category: true, recipes: { include: { ingredient: true } } } }))));

r.post('/menu-items', authenticate, requirePermission('menu:create'),
  validate(V.menuItemSchema), asyncHandler(async (req, res) =>
    created(res, await prisma.menuItem.create({ data: req.body }))));

r.put('/menu-items/:id', authenticate, requirePermission('menu:update'),
  validate(V.menuItemSchema), asyncHandler(async (req, res) =>
    ok(res, await prisma.menuItem.update({ where: { id: req.params.id }, data: req.body }))));

r.delete('/menu-items/:id', authenticate, requirePermission('menu:delete'),
  asyncHandler(async (req, res) => {
    await prisma.menuItem.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    await writeAudit({ userId: req.user.id, action: 'DELETE', entity: 'MenuItem',
                       entityId: req.params.id, ip: req.ip });
    noContent(res);
  }));

/* PAYMENTS */
r.post('/payments', authenticate, writeLimiter, requirePermission('payment:create'),
  validate(V.paymentSchema), asyncHandler(async (req, res) => {
    const p = await paymentService.create(req.body, req.user);
    await writeAudit({ userId: req.user.id, action: 'PAY', entity: 'Payment',
                       entityId: p.id, ip: req.ip });
    created(res, p);
  }));

r.get('/payments', authenticate, requirePermission('payment:read'), NO_STORE,
  asyncHandler(async (req, res) => {
    const pg = paginate(req.query);
    const { rows, meta } = await paymentService.list({ ...req.query, ...pg });
    ok(res, rows, meta);
  }));

r.get('/payments/:id/receipt', authenticate, requirePermission('payment:read'),
  asyncHandler(async (req, res) => {
    const { default: PDFDocument } = await import('pdfkit');
    const p = await prisma.payment.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { reservation: { include: { user: true, table: true, items:
        { include: { menuItem: true } } } } }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${p.refCode}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text('TableTime Restaurant', { align: 'center' });
    doc.fontSize(14).text('RECEIPT', { align: 'center' }).moveDown();
    doc.fontSize(10)
      .text(`Ref: ${p.refCode}`)
      .text(`Date: ${p.paidAt?.toLocaleString('en-GB')}`)
      .text(`Customer: ${p.reservation.user.fullName}`)
      .text(`Table: ${p.reservation.table.tableNo}  |  Party: ${p.reservation.partySize}`)
      .moveDown();
    p.reservation.items.forEach((i) =>
      doc.text(`${i.menuItem.name}  x${i.qty}  =  ${(i.qty * Number(i.unitPrice)).toFixed(2)} THB`));
    doc.moveDown().fontSize(12)
      .text(`Total: ${Number(p.reservation.totalAmount).toFixed(2)} THB`)
      .text(`Deposit Paid: ${Number(p.amount).toFixed(2)} THB`, { underline: true });
    doc.end();
  }));

/* INVENTORY */
r.get('/ingredients', authenticate, requirePermission('ingredient:read'),
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.ingredient.findMany({ orderBy: { name: 'asc' } }))));

r.post('/ingredients', authenticate, requirePermission('ingredient:create'),
  validate(V.ingredientSchema), asyncHandler(async (req, res) =>
    created(res, await prisma.ingredient.create({ data: req.body }))));

r.put('/ingredients/:id', authenticate, requirePermission('ingredient:update'),
  validate(V.ingredientSchema), asyncHandler(async (req, res) =>
    ok(res, await prisma.ingredient.update({ where: { id: req.params.id }, data: req.body }))));

r.delete('/ingredients/:id', authenticate, requirePermission('ingredient:delete'),
  asyncHandler(async (req, res) => {
    await prisma.ingredient.delete({ where: { id: req.params.id } });
    noContent(res);
  }));

r.post('/stock-movements', authenticate, requirePermission('stock:create'),
  validate(V.stockMovementSchema), asyncHandler(async (req, res) => {
    const { ingredientId, type, qty, note } = req.body;
    const ing = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    if (type === 'OUT' && Number(ing.stockQty) < qty) {
      return res.status(409).json({ success: false, error: {
        code: 'INSUFFICIENT_STOCK',
        message: `สต็อกไม่เพียงพอ (คงเหลือ ${ing.stockQty} ${ing.unit})` } });
    }
    const delta = type === 'IN' ? qty : type === 'OUT' ? -qty : qty - Number(ing.stockQty);
    const [mv] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { ingredientId, type, qty, note, createdById: req.user.id } }),
      prisma.ingredient.update({
        where: { id: ingredientId }, data: { stockQty: { increment: delta } } })
    ]);
    created(res, mv);
  }));

r.get('/prep-list', authenticate, requirePermission('stock:read'),
  asyncHandler(async (req, res) => {
    const date = new Date(req.query.date || Date.now());
    ok(res, await prisma.$queryRaw`
      SELECT i.name, i.unit, SUM(rc.qty * ri.qty)::float AS "requiredQty",
             i.stock_qty::float AS "stockQty"
      FROM reservations r
      JOIN reservation_items ri ON ri.reservation_id = r.id
      JOIN recipe_items rc      ON rc.menu_item_id   = ri.menu_item_id
      JOIN ingredients i        ON i.id              = rc.ingredient_id
      WHERE r.reserve_date = ${date} AND r.status IN ('CONFIRMED','PENDING')
      GROUP BY i.id, i.name, i.unit, i.stock_qty ORDER BY 3 DESC`);
  }));

/* EXPENSES */
r.get('/expenses', authenticate, requireRole('OWNER', 'MANAGER'),
  asyncHandler(async (req, res) =>
    ok(res, await prisma.expense.findMany({
      where: { ...(req.query.status && { status: req.query.status }) },
      include: { requestedBy: { select: { fullName: true } },
                 approvedBy:  { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' } }))));

r.post('/expenses', authenticate, requirePermission('expense:create'),
  asyncHandler(async (req, res) =>
    created(res, await prisma.expense.create({
      data: { category: req.body.category, amount: req.body.amount,
              description: req.body.description, requestedById: req.user.id } }))));

r.patch('/expenses/:id/approve', authenticate, requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const status = req.body.approve ? 'APPROVED' : 'REJECTED';
    const e = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status, approvedById: req.user.id, approvedAt: new Date() }
    });
    await writeAudit({ userId: req.user.id, action: status, entity: 'Expense',
                       entityId: e.id, ip: req.ip });
    ok(res, e);
  }));

/* REPORTS */
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

r.get('/reports/overview', authenticate, requirePermission('report:read'), NO_STORE,
  asyncHandler(async (_req, res) => ok(res, await reportService.overview())));

r.get('/reports/sales', authenticate, requirePermission('report:read'), NO_STORE,
  asyncHandler(async (req, res) => ok(res, await reportService.sales({
    from: req.query.from || monthAgo(), to: req.query.to || today() }))));

r.get('/reports/top-menus', authenticate, requirePermission('report:read'),
  asyncHandler(async (req, res) =>
    ok(res, await reportService.topMenus(Number(req.query.limit) || 10))));

r.get('/reports/occupancy', authenticate, requirePermission('report:read'),
  asyncHandler(async (req, res) =>
    ok(res, await reportService.occupancy(req.query.date || today()))));

r.get('/reports/satisfaction', authenticate, requirePermission('report:read'),
  asyncHandler(async (req, res) => ok(res, await reportService.satisfaction({
    from: req.query.from || monthAgo(), to: req.query.to || today() }))));

/* REVIEW */
r.post('/reviews', authenticate, validate(V.reviewSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.review.create({ data: req.body }))));

export default r;
