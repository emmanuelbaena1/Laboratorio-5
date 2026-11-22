"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/api";
import PayPalCheckout from "@/components/PayPalCheckout";

const vacia = {
  calle: "",
  ciudad: "",
  region: "",
  codigoPostal: "",
  telefono: "",
};

export default function CheckoutPage() {
  const { autenticado, cargando, token, esAdmin } = useAuth();
  const { items, vaciar, total, listo } = useCart();
  const router = useRouter();
  const [direccion, setDireccion] = useState(vacia);
  const [lista, setLista] = useState(false);
  const [totalServidor, setTotalServidor] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    if (!cargando && !autenticado) {
      router.replace("/login");
    }
    if (!cargando && esAdmin) {
      router.replace("/admin/pedidos");
    }
  }, [cargando, autenticado, esAdmin, router]);

  if (cargando || !autenticado || !listo) {
    return <p className="text-stone-500">Cargando…</p>;
  }

  if (items.length === 0 && !mensaje) {
    return (
      <div className="card p-8 text-center">
        <p>No hay ítems en el carrito.</p>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  function actualizarCampo(campo, valor) {
    setDireccion((prev) => ({ ...prev, [campo]: valor }));
  }

  function direccionCompleta() {
    return Object.values(direccion).every((v) => String(v).trim().length > 0);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-6">
        <h1 className="font-serif text-2xl font-bold">Dirección de entrega</h1>
        {["calle", "ciudad", "region", "codigoPostal", "telefono"].map((campo) => (
          <div key={campo}>
            <label className="label" htmlFor={campo}>
              {campo === "codigoPostal"
                ? "Código postal"
                : campo === "region"
                  ? "Región"
                  : campo === "telefono"
                    ? "Teléfono"
                    : campo.charAt(0).toUpperCase() + campo.slice(1)}
            </label>
            <input
              id={campo}
              className="input"
              value={direccion[campo]}
              onChange={(e) => actualizarCampo(campo, e.target.value)}
              required
            />
          </div>
        ))}
        {!lista && (
          <button
            type="button"
            className="btn-primary"
            disabled={!direccionCompleta()}
            onClick={() => setLista(true)}
          >
            Continuar al pago
          </button>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-serif text-2xl font-bold">Resumen</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.libroId} className="flex justify-between gap-2">
              <span>
                {i.titulo} × {i.cantidad}
              </span>
              <span>{formatMoney(i.precio * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <p className="text-lg font-semibold">
          Total: {formatMoney(totalServidor ?? total)}
        </p>
        <p className="text-xs text-stone-500">
          El total definitivo lo calcula el servidor al crear el pago (USD).
        </p>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {capturando && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
            <span>Procesando y capturando el pago con PayPal…</span>
          </div>
        )}
        {mensaje && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {mensaje}{" "}
            <Link href="/pedidos" className="underline">
              Ver mis pedidos
            </Link>
          </div>
        )}

        {lista && !mensaje && !capturando && (
          <PayPalCheckout
            token={token}
            items={items}
            direccion={direccion}
            onOrderCreated={(data) => {
              setTotalServidor(data.total);
              setError("");
            }}
            onCapturing={(estado) => setCapturando(estado)}
            onPaid={() => {
              vaciar();
              setMensaje("Pago confirmado. Tu pedido quedó registrado como Pagado.");
            }}
            onFail={(msg) => {
              setError(msg);
              setLista(false);
              setTotalServidor(null);
            }}
          />
        )}
      </section>
    </div>
  );
}
