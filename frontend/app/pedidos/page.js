"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, formatMoney } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const BADGE = {
  Pagado: "bg-amber-100 text-amber-800",
  Preparando: "bg-sky-100 text-sky-800",
  Despachado: "bg-violet-100 text-violet-800",
  Entregado: "bg-green-100 text-green-800",
};

export default function PedidosPage() {
  const { autenticado, cargando, token, esAdmin } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cargando && !autenticado) router.replace("/login");
    if (!cargando && esAdmin) router.replace("/admin/pedidos");
  }, [cargando, autenticado, esAdmin, router]);

  useEffect(() => {
    if (!token || !autenticado || esAdmin) return;

    api("/api/pedidos", { token })
      .then((data) => setPedidos(data.pedidos || []))
      .catch((err) => setError(err.message));

    const socket = getSocket(token);
    if (!socket) return undefined;

    const handler = (pedido) => {
      setPedidos((prev) => {
        const idx = prev.findIndex((p) => p._id === pedido._id);
        if (idx === -1) {
          return [pedido, ...prev];
        }
        const copia = [...prev];
        copia[idx] = { ...copia[idx], ...pedido };
        return copia;
      });
    };

    socket.on("pedido:actualizado", handler);
    return () => {
      socket.off("pedido:actualizado", handler);
    };
  }, [token, autenticado, esAdmin]);

  if (cargando || !autenticado) {
    return <p className="text-stone-500">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Mis pedidos</h1>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {pedidos.length === 0 ? (
        <p className="text-stone-500">Aún no tienes pedidos pagados.</p>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <article key={pedido._id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-stone-500">
                  Pedido {pedido._id.slice(-6).toUpperCase()} ·{" "}
                  {new Date(pedido.createdAt).toLocaleString("es-CO")}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    BADGE[pedido.estado] || "bg-stone-100 text-stone-700"
                  }`}
                >
                  {pedido.estado}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {pedido.items.map((item, i) => (
                  <li key={`${pedido._id}-${i}`}>
                    {item.titulo} × {item.cantidad} — {formatMoney(item.precio)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-semibold">
                Total: {formatMoney(pedido.total, pedido.moneda)}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Envío a {pedido.direccion.calle}, {pedido.direccion.ciudad}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
