require("dotenv").config();

const http = require("http");
const { crearApp } = require("./app");
const { conectarDB } = require("./config/db");
const { inicializarSockets } = require("./sockets");

const authRoutes = require("./routes/auth");
const librosRoutes = require("./routes/libros");
const pedidosRoutes = require("./routes/pedidos");
const pagosRoutes = require("./routes/pagos");

async function main() {
  await conectarDB();

  const app = crearApp({
    routes: {
      auth: authRoutes,
      libros: librosRoutes,
      pedidos: pedidosRoutes,
      pagos: pagosRoutes,
    },
  });

  const server = http.createServer(app);
  inicializarSockets(server);

  const port = Number(process.env.PORT) || 4000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`LibroYa API escuchando en 0.0.0.0:${port}`);
  });
}

main().catch((err) => {
  console.error("No se pudo iniciar el servidor:", err);
  process.exit(1);
});
