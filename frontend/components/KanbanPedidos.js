"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { api, formatMoney } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const COLUMNAS = ["Pagado", "Preparando", "Despachado", "Entregado"];

function PedidoCard({ pedido, dragging }) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-3 shadow-sm ${
        dragging ? "opacity-80 ring-2 ring-[#b4533a]" : ""
      }`}
    >
      <p className="text-xs text-stone-500">
        #{pedido._id.slice(-6).toUpperCase()}
      </p>
      <p className="mt-1 text-sm font-semibold">
        {pedido.usuario?.nombre || "Cliente"}
      </p>
      <p className="text-xs text-stone-600">
        {pedido.items.length} ítem(s) · {formatMoney(pedido.total)}
      </p>
      <p className="mt-1 text-xs text-stone-500">
        {pedido.direccion?.ciudad}
      </p>
    </div>
  );
}

function DraggablePedido({ pedido }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: pedido._id,
      data: { pedido },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <PedidoCard pedido={pedido} />
    </div>
  );
}

function Columna({ estado, pedidos }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[420px] rounded-2xl border p-3 ${
        isOver ? "border-[#b4533a] bg-[#b4533a]/5" : "border-stone-300 bg-stone-50/80"
      }`}
    >
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-700">
        {estado} ({pedidos.length})
      </h3>
      <div className="space-y-2">
        {pedidos.map((p) => (
          <DraggablePedido key={p._id} pedido={p} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPedidos({ token }) {
  const [pedidos, setPedidos] = useState([]);
  const [activo, setActivo] = useState(null);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    if (!token) return undefined;

    api("/api/pedidos", { token })
      .then((data) => setPedidos(data.pedidos || []))
      .catch((err) => setError(err.message));

    const socket = getSocket(token);
    if (!socket) return undefined;

    const handler = (pedido) => {
      setPedidos((prev) => {
        const idx = prev.findIndex((p) => p._id === pedido._id);
        if (idx === -1) return [pedido, ...prev];
        const copia = [...prev];
        copia[idx] = { ...copia[idx], ...pedido };
        return copia;
      });
    };

    socket.on("pedido:actualizado", handler);
    return () => socket.off("pedido:actualizado", handler);
  }, [token]);

  const porColumna = useMemo(() => {
    const map = Object.fromEntries(COLUMNAS.map((c) => [c, []]));
    for (const p of pedidos) {
      if (map[p.estado]) map[p.estado].push(p);
    }
    return map;
  }, [pedidos]);

  async function onDragEnd(event) {
    setActivo(null);
    const { active, over } = event;
    if (!over) return;

    const pedidoId = active.id;
    const destino = COLUMNAS.includes(over.id)
      ? over.id
      : over.data?.current?.pedido?.estado;

    if (!destino || !COLUMNAS.includes(destino)) return;

    const pedido = pedidos.find((p) => p._id === pedidoId);
    if (!pedido || pedido.estado === destino) return;

    const previo = pedido.estado;
    setPedidos((prev) =>
      prev.map((p) => (p._id === pedidoId ? { ...p, estado: destino } : p))
    );

    try {
      const data = await api(`/api/pedidos/${pedidoId}/estado`, {
        method: "PATCH",
        token,
        body: { estado: destino },
      });
      setPedidos((prev) =>
        prev.map((p) => (p._id === pedidoId ? data.pedido : p))
      );
      setError("");
    } catch (err) {
      setPedidos((prev) =>
        prev.map((p) => (p._id === pedidoId ? { ...p, estado: previo } : p))
      );
      setError(err.message || "No se pudo cambiar el estado");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActivo(e.active.data.current?.pedido || null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActivo(null)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNAS.map((estado) => (
            <Columna
              key={estado}
              estado={estado}
              pedidos={porColumna[estado]}
            />
          ))}
        </div>
        <DragOverlay>
          {activo ? <PedidoCard pedido={activo} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
