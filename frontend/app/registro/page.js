"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RegistroPage() {
  const { registro, autenticado, cargando } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && autenticado) {
      router.replace("/");
    }
  }, [cargando, autenticado, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      await registro(nombre, email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-6">
      <h1 className="font-serif text-2xl font-bold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-stone-600">
        El registro público solo crea cuentas de cliente.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={enviando}>
          {enviando ? "Creando…" : "Registrarme"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#b4533a] underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
