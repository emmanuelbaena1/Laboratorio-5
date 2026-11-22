require("dotenv").config({ path: ".env.test" });

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-libroy";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "test-client";
process.env.PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET || "test-secret";
process.env.PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const { crearApp } = require("../src/app");
const authRoutes = require("../src/routes/auth");
const librosRoutes = require("../src/routes/libros");
const pedidosRoutes = require("../src/routes/pedidos");
const pagosRoutes = require("../src/routes/pagos");
const {
  __setPaypalImpl,
  __resetPaypalImpl,
} = require("../src/services/paypal");

let mongoServer;

function crearServidor() {
  return crearApp({
    routes: {
      auth: authRoutes,
      libros: librosRoutes,
      pedidos: pedidosRoutes,
      pagos: pagosRoutes,
    },
  });
}

async function iniciarDb() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return uri;
}

async function limpiarDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function cerrarDb() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

function mockPaypal({
  orderId = `ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  captureId = `CAPTURE-${Date.now()}`,
  totalFromOrder = null,
  status = "COMPLETED",
  currency = "USD",
} = {}) {
  let lastTotal = totalFromOrder;

  __setPaypalImpl({
    async crearOrdenPayPal({ total }) {
      lastTotal = total;
      return { id: typeof orderId === "function" ? orderId() : orderId };
    },
    async capturarOrdenPayPal(id) {
      const value = Number(lastTotal ?? 0).toFixed(2);
      return {
        id,
        status,
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: typeof captureId === "function" ? captureId() : captureId,
                  status: "COMPLETED",
                  amount: {
                    currency_code: currency,
                    value,
                  },
                },
              ],
            },
          },
        ],
      };
    },
  });

  return { orderId, captureId };
}

module.exports = {
  request,
  crearServidor,
  iniciarDb,
  limpiarDb,
  cerrarDb,
  mockPaypal,
  resetPaypal: __resetPaypalImpl,
};
