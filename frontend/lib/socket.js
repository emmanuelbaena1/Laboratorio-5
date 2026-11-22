"use client";

import { io } from "socket.io-client";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket = null;

export function getSocket(token) {
  if (!token) {
    return null;
  }

  if (socket?.connected && socket.auth?.token === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
