"use client";

import { useRef } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { api } from "@/lib/api";

export default function PayPalCheckout({
  token,
  items,
  direccion,
  onOrderCreated,
  onCapturing,
  onPaid,
  onFail,
}) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const orderIdRef = useRef(null);

  async function cancelarSiHayOrden() {
    const paypalOrderId = orderIdRef.current;
    if (!paypalOrderId) return;
    try {
      await api("/api/pagos/cancelar", {
        method: "POST",
        token,
        body: { paypalOrderId },
      });
    } catch {
      /* idempotente / ya cancelado */
    } finally {
      orderIdRef.current = null;
    }
  }

  if (!clientId) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Falta NEXT_PUBLIC_PAYPAL_CLIENT_ID para mostrar el botón de PayPal.
      </p>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill", label: "pay" }}
        createOrder={async () => {
          const data = await api("/api/pagos/crear", {
            method: "POST",
            token,
            body: {
              items: items.map((i) => ({
                libroId: i.libroId,
                cantidad: i.cantidad,
              })),
              direccion,
            },
          });
          orderIdRef.current = data.paypalOrderId;
          onOrderCreated?.(data);
          return data.paypalOrderId;
        }}
        onApprove={async (data) => {
          onCapturing?.(true);
          try {
            const result = await api("/api/pagos/capturar", {
              method: "POST",
              token,
              body: { paypalOrderId: data.orderID },
            });
            orderIdRef.current = null;
            onPaid?.(result.pedido);
          } catch (err) {
            onFail?.(err.message || "Error al capturar el pago.");
          } finally {
            onCapturing?.(false);
          }
        }}
        onCancel={async () => {
          await cancelarSiHayOrden();
          onFail?.("Pago cancelado. El stock se liberó.");
        }}
        onError={async (err) => {
          console.error(err);
          await cancelarSiHayOrden();
          onFail?.(
            "Hubo un error con PayPal. Si se reservó stock, quedó liberado."
          );
        }}
      />
    </PayPalScriptProvider>
  );
}
