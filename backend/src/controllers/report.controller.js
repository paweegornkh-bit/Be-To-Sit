import { reportService } from '../services/report.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

export const reportController = {
  overview: asyncHandler(async (_req, res) =>
    ok(res, await reportService.overview())),
  sales: asyncHandler(async (req, res) =>
    ok(res, await reportService.sales({
      from: req.query.from || monthAgo(), to: req.query.to || today()
    }))),
  topMenus: asyncHandler(async (req, res) =>
    ok(res, await reportService.topMenus(Number(req.query.limit) || 10))),
  occupancy: asyncHandler(async (req, res) =>
    ok(res, await reportService.occupancy(req.query.date || today()))),
  satisfaction: asyncHandler(async (req, res) =>
    ok(res, await reportService.satisfaction({
      from: req.query.from || monthAgo(), to: req.query.to || today()
    })))
};
