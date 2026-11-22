"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

const AuthContext = createContext(null);
const TOKEN_KEY = "libroy_token";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  const guardarSesion = useCallback((nuevoToken, nuevoUsuario) => {
    localStorage.setItem(TOKEN_KEY, nuevoToken);
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
    disconnectSocket();
  }, []);

  useEffect(() => {
    const guardado = localStorage.getItem(TOKEN_KEY);
    if (!guardado) {
      setCargando(false);
      return;
    }

    setToken(guardado);
    api("/api/auth/me", { token: guardado })
      .then((data) => setUsuario(data.usuario))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUsuario(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      guardarSesion(data.token, data.usuario);
      return data.usuario;
    },
    [guardarSesion]
  );

  const registro = useCallback(
    async (nombre, email, password) => {
      const data = await api("/api/auth/registro", {
        method: "POST",
        body: { nombre, email, password },
      });
      guardarSesion(data.token, data.usuario);
      return data.usuario;
    },
    [guardarSesion]
  );

  const value = useMemo(
    () => ({
      usuario,
      token,
      cargando,
      login,
      registro,
      cerrarSesion,
      esAdmin: usuario?.rol === "admin",
      autenticado: Boolean(usuario && token),
    }),
    [usuario, token, cargando, login, registro, cerrarSesion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
