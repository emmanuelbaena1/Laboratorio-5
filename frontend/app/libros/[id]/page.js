"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatMoney } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function LibroDetallePage() {
  const { id } = useParams();
  const { agregar } = useCart();
  const [libro, setLibro] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api(`/api/libros/${id}`)
      .then((data) => setLibro(data.libro))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p>;
  }

  if (!libro) {
    return <p className="text-stone-500">Cargando libro…</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={libro.imagen}
          alt={libro.titulo}
          className="aspect-[3/4] w-full object-cover"
        />
      </div>
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-[#b4533a]">{libro.categoria}</p>
        <h1 className="font-serif text-3xl font-bold">{libro.titulo}</h1>
        <p className="text-lg text-stone-600">{libro.autor}</p>
        <p className="text-stone-700">{libro.descripcion}</p>
        <p className="text-2xl font-semibold">{formatMoney(libro.precio)}</p>
        <p className="text-sm text-stone-500">Disponibles en bodega: {libro.stock}</p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="cantidad">
              Cantidad
            </label>
            <input
              id="cantidad"
              type="number"
              min={1}
              max={libro.stock}
              className="input w-24"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value) || 1)}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={libro.stock < 1}
            onClick={() => {
              agregar(libro, cantidad);
              setMensaje("Agregado al carrito");
            }}
          >
            Agregar al carrito
          </button>
        </div>
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
      </div>
    </div>
  );
}
