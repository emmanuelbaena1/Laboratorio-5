"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/lib/api";

export default function CarritoPage() {
  const { items, actualizarCantidad, quitar, total } = useCart();
  const { autenticado } = useAuth();

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h1 className="font-serif text-2xl font-bold">Tu carrito está vacío</h1>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Carrito</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.libroId}
            className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imagen}
              alt={item.titulo}
              className="h-24 w-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="font-serif text-lg font-bold">{item.titulo}</h2>
              <p className="text-sm text-stone-600">{item.autor}</p>
              <p className="mt-1 font-medium">{formatMoney(item.precio)}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={item.stock}
                className="input w-20"
                value={item.cantidad}
                onChange={(e) =>
                  actualizarCantidad(item.libroId, Number(e.target.value) || 1)
                }
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => quitar(item.libroId)}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <p className="text-xl font-semibold">Total estimado: {formatMoney(total)}</p>
        {autenticado ? (
          <Link href="/checkout" className="btn-primary">
            Ir al checkout
          </Link>
        ) : (
          <div className="text-sm text-stone-600">
            <Link href="/login" className="text-[#b4533a] underline">
              Inicia sesión
            </Link>{" "}
            para continuar con el pago.
          </div>
        )}
      </div>
    </div>
  );
}
