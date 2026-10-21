export class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = () =>
  new AppError(404, "NOT_FOUND", "Request not found");

export const validationError = (fields) =>
  new AppError(422, "VALIDATION_ERROR", "Some fields are invalid", { fields });

export function errorHandler(err, req, res, next) {
  let { status, code, message, details } = err;

  if (!(err instanceof AppError)) {
    if (err.type === "entity.parse.failed") {
      ({ status, code, message, details } = new AppError(
        400,
        "INVALID_JSON",
        "Request body is not valid JSON",
      ));
    } else if (err.code === "23514") {
      // A DB CHECK constraint fired: the service should have caught it first
      ({ status, code, message, details } = new AppError(
        422,
        "CONSTRAINT_VIOLATION",
        "Data violates a database constraint",
        { constraint: err.constraint },
      ));
    } else {
      console.error(err);
      ({ status, code, message, details } = new AppError(
        500,
        "INTERNAL_ERROR",
        "Something went wrong on the server",
      ));
    }
  }

  res.status(status).json({ error: { code, message, details } });
}
