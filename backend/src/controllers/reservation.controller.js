import { reservationService } from '../services/reservation.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created, noContent, paginate } from '../utils/response.js';
import { auditService } from '../services/audit.service.js';

export const reservationController = {
  list: asyncHandler(async (req, res) => {
    const page = paginate(req.query);
    const result = await reservationService.list({ ...req.query, ...page, user: req.user });
    ok(res, result.rows, result.meta);
  }),
  get: asyncHandler(async (req, res) =>
    ok(res, await reservationService.getById(req.params.id, req.user))),
  create: asyncHandler(async (req, res) => {
    const reservation = await reservationService.create(req.body, req.user);
    await auditService.write({ userId: req.user.id, action: 'CREATE', entity: 'Reservation',
                       entityId: reservation.id, ip: req.ip });
    created(res, reservation);
  }),
  update: asyncHandler(async (req, res) =>
    ok(res, await reservationService.update(req.params.id, req.body, req.user))),
  updateStatus: asyncHandler(async (req, res) => {
    const reservation = await reservationService.updateStatus(
      req.params.id, req.body.status, req.user
    );
    await auditService.write({ userId: req.user.id, action: `STATUS_${req.body.status}`,
                       entity: 'Reservation', entityId: reservation.id, ip: req.ip });
    ok(res, reservation);
  }),
  cancel: asyncHandler(async (req, res) => {
    await reservationService.cancel(req.params.id, req.user);
    await auditService.write({ userId: req.user.id, action: 'CANCEL', entity: 'Reservation',
                       entityId: req.params.id, ip: req.ip });
    noContent(res);
  })
};
