class AppError extends Error {
  constructor(mensaje, statusCode = 400) {
    super(mensaje);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = AppError;
