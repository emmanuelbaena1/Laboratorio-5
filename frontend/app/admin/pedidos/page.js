"use client";

import { useAuth } from "@/context/AuthContext";
import KanbanPedidos from "@/components/KanbanPedidos";

export default function AdminPedidosPage() {
  const { token } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tablero de pedidos</h1>
        <p className="mt-1 text-sm text-stone-600">
          Arrastra cada pedido solo al estado siguiente. Si el salto no es válido,
          la tarjeta vuelve a su columna.
        </p>
      </div>
      <KanbanPedidos token={token} />
    </div>
  );
}
