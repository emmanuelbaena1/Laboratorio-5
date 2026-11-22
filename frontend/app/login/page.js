"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, autenticado, esAdmin, cargando } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && autenticado) {
      router.replace(esAdmin ? "/admin/pedidos" : "/");
    }
  }, [cargando, autenticado, esAdmin, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const usuario = await login(email, password);
      router.push(usuario.rol === "admin" ? "/admin/pedidos" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-6">
      <h1 className="font-serif text-2xl font-bold">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-stone-600">
        Accede para comprar o gestionar pedidos.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-[#b4533a] underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
