const mongoose = require("mongoose");

const ESTADOS = [
  "PendientePago",
  "Cancelado",
  "Pagado",
  "Preparando",
  "Despachado",
  "Entregado",
];

const ESTADOS_VISIBLES = ["Pagado", "Preparando", "Despachado", "Entregado"];

const SIGUIENTE_ESTADO = {
  Pagado: "Preparando",
  Preparando: "Despachado",
  Despachado: "Entregado",
};

const itemSchema = new mongoose.Schema(
  {
    libro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Libro",
      required: true,
    },
    titulo: {
      type: String,
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const direccionSchema = new mongoose.Schema(
  {
    calle: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    codigoPostal: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const pedidoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    items: {
      type: [itemSchema],
      required: true,
      validate: [(v) => v.length > 0, "El pedido debe tener al menos un ítem"],
    },
    direccion: {
      type: direccionSchema,
      required: true,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    moneda: {
      type: String,
      enum: ["USD"],
      default: "USD",
    },
    estado: {
      type: String,
      enum: ESTADOS,
      default: "PendientePago",
    },
    paypalOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    captureId: {
      type: String,
      default: null,
    },
    stockLiberado: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pedido", pedidoSchema);
module.exports.ESTADOS = ESTADOS;
module.exports.ESTADOS_VISIBLES = ESTADOS_VISIBLES;
module.exports.SIGUIENTE_ESTADO = SIGUIENTE_ESTADO;
