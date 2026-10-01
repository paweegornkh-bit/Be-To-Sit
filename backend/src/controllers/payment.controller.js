import { paymentService } from '../services/payment.service.js';
import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { ok, created, paginate } from '../utils/response.js';
import { auditService } from '../services/audit.service.js';

export const paymentController = {
  create: asyncHandler(async (req, res) => {
    const payment = await paymentService.create(req.body, req.user);
    await auditService.write({ userId: req.user.id, action: 'PAY', entity: 'Payment',
                       entityId: payment.id, ip: req.ip });
    created(res, payment);
  }),
  submitSlip: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('กรุณาแนบสลิปการโอนเงิน');
    const { reservationId, method = 'TRANSFER' } = req.body;
    const payment = await paymentService.submitSlip({
      reservationId, method, slipUrl: req.file.storageKey
    }, req.user);
    await auditService.write({ userId: req.user.id, action: 'SUBMIT_PAYMENT_SLIP',
                       entity: 'Payment', entityId: payment.id, ip: req.ip });
    created(res, payment);
  }),
  getSlip: asyncHandler(async (req, res) => {
    const file = await paymentService.getSlip(req.params.id, req.user);
    res.set('Cache-Control', 'private, no-store')
      .set('X-Content-Type-Options', 'nosniff')
      .set('Content-Disposition', 'inline')
      .type(file.contentType)
      .send(file.buffer);
  }),
  review: asyncHandler(async (req, res) => {
    const payment = await paymentService.review(req.params.id, req.body.approve);
    await auditService.write({ userId: req.user.id,
      action: req.body.approve ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
      entity: 'Payment', entityId: payment.id, ip: req.ip });
    ok(res, payment);
  }),
  list: asyncHandler(async (req, res) => {
    const page = paginate(req.query);
    const result = await paymentService.list({ ...req.query, ...page });
    ok(res, result.rows, result.meta);
  }),
  receipt: asyncHandler(async (req, res) => {
    const payment = await paymentService.getReceiptData(req.params.id);
    const { default: PDFDocument } = await import('pdfkit');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.refCode}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text('TableTime Restaurant', { align: 'center' });
    doc.fontSize(14).text('RECEIPT', { align: 'center' }).moveDown();
    doc.fontSize(10)
      .text(`Ref: ${payment.refCode}`)
      .text(`Date: ${payment.paidAt?.toLocaleString('en-GB')}`)
      .text(`Customer: ${payment.reservation.user.fullName}`)
      .text(`Table: ${payment.reservation.table.tableNo}  |  Party: ${payment.reservation.partySize}`)
      .moveDown();
    payment.reservation.items.forEach((item) =>
      doc.text(`${item.menuItem.name}  x${item.qty}  =  ${(item.qty * Number(item.unitPrice)).toFixed(2)} THB`));
    doc.moveDown().fontSize(12)
      .text(`Total: ${Number(payment.reservation.totalAmount).toFixed(2)} THB`)
      .text(`Deposit Paid: ${Number(payment.amount).toFixed(2)} THB`, { underline: true });
    doc.end();
  })
};
