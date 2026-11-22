const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

let io = null;

function inicializarSockets(server) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  io = new Server(server, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("No autorizado"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const usuario = await Usuario.findById(payload.id);
      if (!usuario) {
        return next(new Error("Usuario no encontrado"));
      }

      socket.usuario = usuario;
      return next();
    } catch {
      return next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.usuario._id.toString();
    socket.join(`user:${userId}`);
    if (socket.usuario.rol === "admin") {
      socket.join("admins");
    }
  });

  return io;
}

function emitirPedidoActualizado(pedido) {
  if (!io) return;

  const payload =
    typeof pedido.toObject === "function" ? pedido.toObject() : pedido;

  if (
    payload.estado === "PendientePago" ||
    payload.estado === "Cancelado"
  ) {
    return;
  }

  const userId = payload.usuario?._id
    ? payload.usuario._id.toString()
    : payload.usuario?.toString?.() || String(payload.usuario);

  io.to(`user:${userId}`).emit("pedido:actualizado", payload);
  io.to("admins").emit("pedido:actualizado", payload);
}

function getIO() {
  return io;
}

module.exports = { inicializarSockets, emitirPedidoActualizado, getIO };
