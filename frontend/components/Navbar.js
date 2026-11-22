"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { usuario, autenticado, esAdmin, cerrarSesion } = useAuth();
  const { cantidadTotal } = useCart();
  const [abierto, setAbierto] = useState(false);

  const enlaces = [
    { href: "/", label: "Catálogo" },
    { href: "/carrito", label: `Carrito (${cantidadTotal})` },
  ];

  if (autenticado) {
    enlaces.push({ href: "/pedidos", label: "Mis pedidos" });
  }
  if (esAdmin) {
    enlaces.push({ href: "/admin/pedidos", label: "Admin" });
    enlaces.push({ href: "/admin/libros", label: "Libros" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-300/70 bg-[#f6f1e7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-2xl font-bold text-stone-900">
          LibroYa
        </Link>

        <button
          type="button"
          className="rounded-md border border-stone-400 px-3 py-1 text-sm md:hidden"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label="Abrir menú"
        >
          Menú
        </button>

        <nav
          className={`${
            abierto ? "flex" : "hidden"
          } absolute left-0 right-0 top-full flex-col gap-2 border-b border-stone-300 bg-[#f6f1e7] px-4 py-3 shadow-md md:static md:flex md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="text-sm font-medium text-stone-700 hover:text-[#b4533a]"
              onClick={() => setAbierto(false)}
            >
              {e.label}
            </Link>
          ))}

          {autenticado ? (
            <div className="flex flex-col gap-2 md:ml-2 md:flex-row md:items-center">
              <span className="text-sm text-stone-600">Hola, {usuario.nombre}</span>
              <button
                type="button"
                onClick={() => {
                  cerrarSesion();
                  setAbierto(false);
                }}
                className="rounded-full bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 md:ml-2 md:flex-row">
              <Link
                href="/login"
                className="text-sm font-medium text-stone-700"
                onClick={() => setAbierto(false)}
              >
                Entrar
              </Link>
              <Link
                href="/registro"
                className="rounded-full bg-[#b4533a] px-3 py-1.5 text-center text-sm text-white hover:bg-[#9a3f2a]"
                onClick={() => setAbierto(false)}
              >
                Crear cuenta
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
