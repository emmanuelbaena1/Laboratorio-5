const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario._id.toString(), rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

const proteger = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");

  if (!token) {
    throw new AppError("No autorizado", 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }

  const usuario = await Usuario.findById(payload.id);
  if (!usuario) {
    throw new AppError("Usuario no encontrado", 401);
  }

  req.usuario = usuario;
  next();
});

function autorizar(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new AppError("No tienes permiso para esta acción", 403));
    }
    return next();
  };
}

module.exports = { firmarToken, proteger, autorizar };
