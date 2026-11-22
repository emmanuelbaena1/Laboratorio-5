const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const Usuario = require("../models/Usuario");
const { firmarToken, proteger } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: "Demasiados intentos. Intenta de nuevo más tarde." },
});

const registroSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

router.post(
  "/registro",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registroSchema.parse(req.body);

    const existe = await Usuario.findOne({ email: data.email.toLowerCase() });
    if (existe) {
      throw new AppError("Ya existe una cuenta con ese email", 409);
    }

    const usuario = await Usuario.create({
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      rol: "cliente",
    });

    const token = firmarToken(usuario);
    res.status(201).json({ token, usuario });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);

    const usuario = await Usuario.findOne({
      email: data.email.toLowerCase(),
    }).select("+password");

    if (!usuario || !(await usuario.compararPassword(data.password))) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const token = firmarToken(usuario);
    res.json({
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      },
    });
  })
);

router.get(
  "/me",
  proteger,
  asyncHandler(async (req, res) => {
    res.json({ usuario: req.usuario });
  })
);

module.exports = router;
