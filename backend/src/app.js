const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");

function crearApp({ routes = {} } = {}) {
  const app = express();
  app.set("trust proxy", 1);

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  app.use(helmet());
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
  });

  if (routes.auth) app.use("/api/auth", routes.auth);
  if (routes.libros) app.use("/api/libros", routes.libros);
  if (routes.pedidos) app.use("/api/pedidos", routes.pedidos);
  if (routes.pagos) app.use("/api/pagos", routes.pagos);

  app.use((req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
  });

  app.use(errorHandler);
  return app;
}

module.exports = { crearApp };
