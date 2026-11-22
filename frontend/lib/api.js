const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getApiUrl() {
  return API_URL;
}

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { mensaje: text };
    }
  }

  if (!res.ok) {
    const error = new Error(data?.mensaje || "Error en la solicitud");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
  }).format(Number(value) || 0);
}
