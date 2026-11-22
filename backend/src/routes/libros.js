const express = require("express");
const { z } = require("zod");
const Libro = require("../models/Libro");
const { proteger, autorizar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const router = express.Router();

const libroSchema = z.object({
  titulo: z.string().min(1),
  autor: z.string().min(1),
  descripcion: z.string().min(1),
  precio: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  categoria: z.string().min(1),
  imagen: z.string().url(),
  activo: z.boolean().optional(),
});

const stockSchema = z.object({
  stock: z.number().int().nonnegative(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtro = { activo: true };
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    if (req.query.q) {
      const q = String(req.query.q);
      filtro.$or = [
        { titulo: { $regex: q, $options: "i" } },
        { autor: { $regex: q, $options: "i" } },
      ];
    }

    const libros = await Libro.find(filtro).sort({ createdAt: -1 });
    res.json({ libros });
  })
);

router.get(
  "/admin/todos",
  proteger,
  autorizar("admin"),
  asyncHandler(async (req, res) => {
    const filtro = {};
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    if (req.query.q) {
      const q = String(req.query.q);
      filtro.$or = [
        { titulo: { $regex: q, $options: "i" } },
        { autor: { $regex: q, $options: "i" } },
      ];
    }
    const libros = await Libro.find(filtro).sort({ createdAt: -1 });
    res.json({ libros });
  })
);

router.get(
  "/categorias",
  asyncHandler(async (req, res) => {
    const categorias = await Libro.distinct("categoria", { activo: true });
    res.json({ categorias: categorias.sort() });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const libro = await Libro.findById(req.params.id);
    if (!libro) {
      throw new AppError("Libro no encontrado", 404);
    }
    if (!libro.activo && (!req.usuario || req.usuario.rol !== "admin")) {
      throw new AppError("Libro no encontrado", 404);
    }
    res.json({ libro });
  })
);

router.post(
  "/",
  proteger,
  autorizar("admin"),
  asyncHandler(async (req, res) => {
    const data = libroSchema.parse(req.body);
    const libro = await Libro.create(data);
    res.status(201).json({ libro });
  })
);

router.put(
  "/:id",
  proteger,
  autorizar("admin"),
  asyncHandler(async (req, res) => {
    const data = libroSchema.partial().parse(req.body);
    const libro = await Libro.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!libro) {
      throw new AppError("Libro no encontrado", 404);
    }
    res.json({ libro });
  })
);

router.patch(
  "/:id/stock",
  proteger,
  autorizar("admin"),
  asyncHandler(async (req, res) => {
    const { stock } = stockSchema.parse(req.body);
    const libro = await Libro.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true, runValidators: true }
    );
    if (!libro) {
      throw new AppError("Libro no encontrado", 404);
    }
    res.json({ libro });
  })
);

module.exports = router;
