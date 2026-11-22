const express = require("express");
const { z } = require("zod");
const Pedido = require("../models/Pedido");
const {
  ESTADOS_VISIBLES,
  SIGUIENTE_ESTADO,
} = require("../models/Pedido");
const { proteger, autorizar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { emitirPedidoActualizado } = require("../sockets");

const router = express.Router();

const estadoSchema = z.object({
  estado: z.enum(["Pagado", "Preparando", "Despachado", "Entregado"]),
});

router.get(
  "/",
  proteger,
  asyncHandler(async (req, res) => {
    const filtro = {
      estado: { $in: ESTADOS_VISIBLES },
    };

    if (req.usuario.rol !== "admin") {
      filtro.usuario = req.usuario._id;
    }

    const pedidos = await Pedido.find(filtro)
      .populate("usuario", "nombre email")
      .sort({ createdAt: -1 });

    res.json({ pedidos });
  })
);

router.get(
  "/:id",
  proteger,
  asyncHandler(async (req, res) => {
    const pedido = await Pedido.findById(req.params.id).populate(
      "usuario",
      "nombre email"
    );
    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    const esDueño =
      pedido.usuario._id.toString() === req.usuario._id.toString();
    if (!esDueño && req.usuario.rol !== "admin") {
      throw new AppError("No tienes permiso para ver este pedido", 403);
    }

    res.json({ pedido });
  })
);

router.patch(
  "/:id/estado",
  proteger,
  autorizar("admin"),
  asyncHandler(async (req, res) => {
    const { estado } = estadoSchema.parse(req.body);
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    const esperado = SIGUIENTE_ESTADO[pedido.estado];
    if (!esperado || esperado !== estado) {
      throw new AppError(
        `Solo se puede avanzar al siguiente estado. Estado actual: ${pedido.estado}`,
        400
      );
    }

    pedido.estado = estado;
    await pedido.save();

    const poblado = await Pedido.findById(pedido._id).populate(
      "usuario",
      "nombre email"
    );
    emitirPedidoActualizado(poblado);
    res.json({ pedido: poblado });
  })
);

module.exports = router;
