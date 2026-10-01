import { tableService } from '../services/table.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';

export const tableController = {
  listZones: asyncHandler(async (_req, res) => ok(res, await tableService.listZones())),
  listTables: asyncHandler(async (req, res) =>
    ok(res, await tableService.listTables(req.query))),
  updatePosition: asyncHandler(async (req, res) =>
    ok(res, await tableService.updatePosition(req.params.id, req.body))),
  updateStatus: asyncHandler(async (req, res) =>
    ok(res, await tableService.updateStatus(req.params.id, req.body.status)))
};
