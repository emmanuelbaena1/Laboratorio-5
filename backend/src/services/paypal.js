const AppError = require("../utils/AppError");

function getBaseUrl() {
  return process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
}

async function obtenerAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new AppError("Faltan credenciales de PayPal", 500);
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new AppError("No se pudo autenticar con PayPal", 502);
  }

  const data = await res.json();
  return data.access_token;
}

async function crearOrdenPayPalReal({ total, moneda = "USD" }) {
  const token = await obtenerAccessToken();
  const valor = Number(total).toFixed(2);

  const res = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: moneda,
            value: valor,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    console.error("PayPal crear orden:", detalle);
    throw new AppError("No se pudo crear la orden de PayPal", 502);
  }

  return res.json();
}

async function capturarOrdenPayPalReal(orderId) {
  const token = await obtenerAccessToken();
  const res = await fetch(
    `${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const detalle = await res.text();
    console.error("PayPal capturar orden:", detalle);
    throw new AppError("No se pudo capturar el pago en PayPal", 502);
  }

  return res.json();
}

let impl = {
  crearOrdenPayPal: crearOrdenPayPalReal,
  capturarOrdenPayPal: capturarOrdenPayPalReal,
};

function crearOrdenPayPal(...args) {
  return impl.crearOrdenPayPal(...args);
}

function capturarOrdenPayPal(...args) {
  return impl.capturarOrdenPayPal(...args);
}

function __setPaypalImpl(mock) {
  impl = {
    crearOrdenPayPal: mock.crearOrdenPayPal || crearOrdenPayPalReal,
    capturarOrdenPayPal: mock.capturarOrdenPayPal || capturarOrdenPayPalReal,
  };
}

function __resetPaypalImpl() {
  impl = {
    crearOrdenPayPal: crearOrdenPayPalReal,
    capturarOrdenPayPal: capturarOrdenPayPalReal,
  };
}

module.exports = {
  crearOrdenPayPal,
  capturarOrdenPayPal,
  obtenerAccessToken,
  __setPaypalImpl,
  __resetPaypalImpl,
};
