export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
  static badRequest(msg, d)   { return new ApiError(400, 'BAD_REQUEST', msg, d); }
  static unauthorized(msg)    { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg)       { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg)        { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(code, msg)  { return new ApiError(409, code, msg); }
  static validation(msg, d)   { return new ApiError(422, 'VALIDATION_ERROR', msg, d); }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
