const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      mensaje: "Datos inválidos",
      errores: err.errors.map((e) => ({
        campo: e.path.join("."),
        mensaje: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ mensaje: err.message });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ mensaje: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ mensaje: "El recurso ya existe" });
  }

  console.error(err);
  return res.status(500).json({ mensaje: "Error interno del servidor" });
}

module.exports = errorHandler;
