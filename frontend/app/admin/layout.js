"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }) {
  const { cargando, autenticado, esAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!cargando && (!autenticado || !esAdmin)) {
      router.replace("/login");
    }
  }, [cargando, autenticado, esAdmin, router]);

  if (cargando || !autenticado || !esAdmin) {
    return <p className="text-stone-500">Verificando acceso de administrador…</p>;
  }

  const links = [
    { href: "/admin/pedidos", label: "Pedidos" },
    { href: "/admin/libros", label: "Catálogo" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              pathname === l.href
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-700 ring-1 ring-stone-300"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
