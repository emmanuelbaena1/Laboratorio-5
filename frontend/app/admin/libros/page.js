"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatMoney } from "@/lib/api";

const vacio = {
  titulo: "",
  autor: "",
  descripcion: "",
  precio: "",
  stock: "",
  categoria: "",
  imagen: "",
  activo: true,
};

export default function AdminLibrosPage() {
  const { token } = useAuth();
  const [libros, setLibros] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(async () => {
    if (!token) return;
    const data = await api("/api/libros/admin/todos", { token });
    setLibros(data.libros || []);
  }, [token]);

  useEffect(() => {
    cargar().catch((err) => setError(err.message));
  }, [cargar]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    const payload = {
      titulo: form.titulo,
      autor: form.autor,
      descripcion: form.descripcion,
      precio: Number(form.precio),
      stock: Number(form.stock),
      categoria: form.categoria,
      imagen: form.imagen,
      activo: form.activo,
    };

    try {
      if (editId) {
        await api(`/api/libros/${editId}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setOk("Libro actualizado");
      } else {
        await api("/api/libros", {
          method: "POST",
          token,
          body: payload,
        });
        setOk("Libro creado");
      }
      setForm(vacio);
      setEditId(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function editar(libro) {
    setEditId(libro._id);
    setForm({
      titulo: libro.titulo,
      autor: libro.autor,
      descripcion: libro.descripcion,
      precio: String(libro.precio),
      stock: String(libro.stock),
      categoria: libro.categoria,
      imagen: libro.imagen,
      activo: libro.activo,
    });
  }

  async function cambiarStock(libro, stock) {
    const parsed = Number(stock);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("El stock debe ser un número entero mayor o igual a 0");
      return;
    }
    setError("");
    try {
      await api(`/api/libros/${libro._id}/stock`, {
        method: "PATCH",
        token,
        body: { stock: parsed },
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActivo(libro) {
    try {
      await api(`/api/libros/${libro._id}`, {
        method: "PUT",
        token,
        body: {
          titulo: libro.titulo,
          autor: libro.autor,
          descripcion: libro.descripcion,
          precio: libro.precio,
          stock: libro.stock,
          categoria: libro.categoria,
          imagen: libro.imagen,
          activo: !libro.activo,
        },
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Gestionar catálogo</h1>

      <form onSubmit={onSubmit} className="card grid gap-3 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 font-serif text-xl font-bold">
          {editId ? "Editar libro" : "Nuevo libro"}
        </h2>
        {[
          ["titulo", "Título"],
          ["autor", "Autor"],
          ["categoria", "Categoría"],
          ["imagen", "URL de imagen"],
          ["precio", "Precio (USD)"],
          ["stock", "Stock"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              className="input"
              value={form[name]}
              onChange={onChange}
              required
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="label" htmlFor="descripcion">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            className="input min-h-24"
            value={form.descripcion}
            onChange={onChange}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="activo"
            checked={form.activo}
            onChange={onChange}
          />
          Activo en el catálogo
        </label>
        <div className="md:col-span-2 flex gap-2">
          <button type="submit" className="btn-primary">
            {editId ? "Guardar cambios" : "Crear libro"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditId(null);
                setForm(vacio);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-700">{error}</p>}
        {ok && <p className="md:col-span-2 text-sm text-green-700">{ok}</p>}
      </form>

      <div className="overflow-x-auto card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {libros.map((libro) => (
              <tr key={libro._id} className="border-b border-stone-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{libro.titulo}</div>
                  <div className="text-xs text-stone-500">{libro.categoria}</div>
                </td>
                <td className="px-4 py-3">{formatMoney(libro.precio)}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    className="input w-20"
                    defaultValue={libro.stock}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== libro.stock) {
                        cambiarStock(libro, e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  {libro.activo ? "Activo" : "Inactivo"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => editar(libro)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => toggleActivo(libro)}
                    >
                      {libro.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
