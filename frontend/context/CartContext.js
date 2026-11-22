"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);
const CART_KEY = "libroy_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      setItems([]);
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, listo]);

  const agregar = useCallback((libro, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.libroId === libro._id);
      if (existente) {
        return prev.map((i) =>
          i.libroId === libro._id
            ? {
                ...i,
                cantidad: Math.min(
                  i.cantidad + cantidad,
                  libro.stock ?? i.cantidad + cantidad
                ),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          libroId: libro._id,
          titulo: libro.titulo,
          autor: libro.autor,
          precio: libro.precio,
          imagen: libro.imagen,
          stock: libro.stock,
          cantidad,
        },
      ];
    });
  }, []);

  const actualizarCantidad = useCallback((libroId, cantidad) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.libroId === libroId
            ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock || cantidad)) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  }, []);

  const quitar = useCallback((libroId) => {
    setItems((prev) => prev.filter((i) => i.libroId !== libroId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    [items]
  );

  const cantidadTotal = useMemo(
    () => items.reduce((acc, i) => acc + i.cantidad, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      agregar,
      actualizarCantidad,
      quitar,
      vaciar,
      total,
      cantidadTotal,
      listo,
    }),
    [items, agregar, actualizarCantidad, quitar, vaciar, total, cantidadTotal, listo]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}
