const express = require("express");
const { z } = require("zod");
const Libro = require("../models/Libro");
const Pedido = require("../models/Pedido");
const { proteger, autorizar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { reservarStock, devolverStock } = require("../services/stock");
const {
  crearOrdenPayPal,
  capturarOrdenPayPal,
} = require("../services/paypal");
const { emitirPedidoActualizado } = require("../sockets");

const router = express.Router();

const direccionSchema = z.object({
  calle: z.string().min(1),
  ciudad: z.string().min(1),
  region: z.string().min(1),
  codigoPostal: z.string().min(1),
  telefono: z.string().min(1),
});

const crearSchema = z.object({
  items: z
    .array(
      z.object({
        libroId: z.string().min(1),
        cantidad: z.number().int().positive(),
        precio: z.number().optional(),
      })
    )
    .min(1),
  direccion: direccionSchema,
});

const orderIdSchema = z.object({
  paypalOrderId: z.string().min(1),
});

async function liberarStockPedido(pedido) {
  if (pedido.stockLiberado) {
    await pedido.save();
    return;
  }
  await devolverStock(pedido.items);
  pedido.stockLiberado = true;
  await pedido.save();
}

router.post(
  "/crear",
  proteger,
  autorizar("cliente"),
  asyncHandler(async (req, res) => {
    const data = crearSchema.parse(req.body);
    const itemsCalculados = [];
    let total = 0;

    for (const item of data.items) {
      const libro = await Libro.findById(item.libroId);
      if (!libro || !libro.activo) {
        throw new AppError("Uno o más libros no están disponibles", 400);
      }
      if (item.cantidad < 1) {
        throw new AppError("Cantidad inválida", 400);
      }

      const subtotal = libro.precio * item.cantidad;
      total += subtotal;
      itemsCalculados.push({
        libro: libro._id,
        titulo: libro.titulo,
        cantidad: item.cantidad,
        precio: libro.precio,
      });
    }

    total = Math.round(total * 100) / 100;

    await reservarStock(itemsCalculados);

    let ordenPayPal;
    try {
      ordenPayPal = await crearOrdenPayPal({ total, moneda: "USD" });
    } catch (err) {
      await devolverStock(itemsCalculados);
      throw err;
    }

    const pedido = await Pedido.create({
      usuario: req.usuario._id,
      items: itemsCalculados,
      direccion: data.direccion,
      total,
      moneda: "USD",
      estado: "PendientePago",
      paypalOrderId: ordenPayPal.id,
    });

    res.status(201).json({
      pedido,
      paypalOrderId: ordenPayPal.id,
      total: pedido.total,
      moneda: pedido.moneda,
    });
  })
);

router.post(
  "/cancelar",
  proteger,
  autorizar("cliente"),
  asyncHandler(async (req, res) => {
    const { paypalOrderId } = orderIdSchema.parse(req.body);
    const pedido = await Pedido.findOne({ paypalOrderId });

    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    if (pedido.usuario.toString() !== req.usuario._id.toString()) {
      throw new AppError("No tienes permiso para cancelar este pedido", 403);
    }

    if (pedido.estado === "Cancelado") {
      return res.json({ pedido });
    }

    if (pedido.estado !== "PendientePago") {
      throw new AppError("Solo se pueden cancelar pedidos pendientes de pago", 400);
    }

    pedido.estado = "Cancelado";
    await liberarStockPedido(pedido);
    await pedido.save();

    res.json({ pedido });
  })
);

router.post(
  "/capturar",
  proteger,
  autorizar("cliente"),
  asyncHandler(async (req, res) => {
    const { paypalOrderId } = orderIdSchema.parse(req.body);
    const pedido = await Pedido.findOne({ paypalOrderId });

    if (!pedido) {
      throw new AppError("Pedido no encontrado", 404);
    }

    if (pedido.usuario.toString() !== req.usuario._id.toString()) {
      throw new AppError("No tienes permiso para este pedido", 403);
    }

    if (pedido.estado === "Pagado") {
      return res.json({ pedido });
    }

    if (pedido.estado !== "PendientePago") {
      throw new AppError("El pedido no está pendiente de pago", 400);
    }

    let captura;
    try {
      captura = await capturarOrdenPayPal(paypalOrderId);
    } catch (err) {
      pedido.estado = "Cancelado";
      await liberarStockPedido(pedido);
      throw err;
    }

    if (captura.status !== "COMPLETED") {
      pedido.estado = "Cancelado";
      await liberarStockPedido(pedido);
      throw new AppError("El pago no se completó en PayPal", 400);
    }

    const purchaseUnit = captura.purchase_units?.[0];
    const capture =
      purchaseUnit?.payments?.captures?.[0] ||
      purchaseUnit?.payments?.captures?.find((c) => c.status === "COMPLETED");

    const amount = capture?.amount;
    const monto = amount ? Number(amount.value) : NaN;
    const moneda = amount?.currency_code;

    if (
      !amount ||
      moneda !== "USD" ||
      Math.abs(monto - Number(pedido.total)) > 0.001
    ) {
      pedido.estado = "Cancelado";
      await liberarStockPedido(pedido);
      throw new AppError("El monto o la moneda del pago no coinciden", 400);
    }

    const captureId = capture.id;

    const actualizado = await Pedido.findOneAndUpdate(
      { _id: pedido._id, estado: "PendientePago" },
      {
        $set: {
          estado: "Pagado",
          captureId,
        },
      },
      { new: true }
    ).populate("usuario", "nombre email");

    if (!actualizado) {
      const yaPagado = await Pedido.findById(pedido._id).populate(
        "usuario",
        "nombre email"
      );
      return res.json({ pedido: yaPagado });
    }

    emitirPedidoActualizado(actualizado);
    res.json({ pedido: actualizado });
  })
);

module.exports = router;
