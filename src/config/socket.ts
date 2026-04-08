import { Server } from "socket.io";
import http from "http";

let io: Server;
const users = new Map<string, string>();

/* ✅ INIT SOCKET WITH EXISTING SERVER */
export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register", (userId: string) => {
      console.log("Registered user:", userId);
      users.set(userId, socket.id);
    });

    socket.on("disconnect", () => {
      for (let [userId, id] of users.entries()) {
        if (id === socket.id) {
          users.delete(userId);
        }
      }
    });
  });
};

/* ✅ EMIT NOTIFICATION */
export const emitNotification = (userId: string, payload: any) => {
  if (!io) return;

  const socketId = users.get(userId);
  if (socketId) {
    io.to(socketId).emit("notification", payload);
  }
};