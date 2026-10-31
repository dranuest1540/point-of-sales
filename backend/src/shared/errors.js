export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (request, response, next) =>
    Promise.resolve(handler(request, response, next)).catch(next);
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  const isValidationError = error.name === 'ZodError';
  const isMulterError = error.name === 'MulterError';
  const databaseStatuses = { P2002: 409, P2003: 409, P2025: 404, P2034: 409 };
  const uploadStatus = isMulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  const status = error.status ?? (isValidationError ? 400 : isMulterError ? uploadStatus : databaseStatuses[error.code] ?? 500);
  const message = isValidationError
    ? 'Input tidak valid.'
    : isMulterError
      ? (error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 4 MB.' : 'Upload gambar tidak valid.')
      : error.code === 'P2002'
        ? 'Nilai unik sudah digunakan.'
        : error.code === 'P2025'
          ? 'Data tidak ditemukan.'
          : status >= 500 ? 'Terjadi kesalahan pada server.' : error.message;
  const details = isValidationError
    ? error.issues.map(({ path, message: issueMessage }) => ({ field: path.join('.'), message: issueMessage }))
    : error.details;

  response.status(status).json({
    error: { message, ...(details ? { details } : {}) },
  });
}