"use client";

import { useEffect, useState } from "react";
import BookCard from "@/components/BookCard";
import { api } from "@/lib/api";

export default function CatalogoPage() {
  const [libros, setLibros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState("");
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api("/api/libros/categorias")
      .then((data) => setCategorias(data.categorias || []))
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (busqueda) params.set("q", busqueda);
    const query = params.toString();

    setCargando(true);
    api(`/api/libros${query ? `?${query}` : ""}`)
      .then((data) => {
        setLibros(data.libros || []);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [categoria, busqueda]);

  return (
    <div className="space-y-6">
      <section className="card p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#b4533a]">Librería virtual</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-stone-900 md:text-4xl">
          Libros a tu puerta, desde la bodega
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Explora el catálogo, arma tu pedido y recibe tus libros físicos en casa.
          Sin tienda física: controlamos el stock en bodega y te enviamos el paquete.
        </p>
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="q">
            Buscar
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              className="input"
              placeholder="Título o autor"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setBusqueda(q.trim());
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => setBusqueda(q.trim())}
            >
              Buscar
            </button>
          </div>
        </div>
        <div className="md:w-56">
          <label className="label" htmlFor="categoria">
            Categoría
          </label>
          <select
            id="categoria"
            className="input"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {cargando ? (
        <p className="text-stone-500">Cargando catálogo…</p>
      ) : libros.length === 0 ? (
        <p className="text-stone-500">No hay libros para mostrar.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libros.map((libro) => (
            <BookCard key={libro._id} libro={libro} />
          ))}
        </div>
      )}
    </div>
  );
}
