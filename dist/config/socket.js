import { Server } from "socket.io";
import http from "http";
let io;
const users = new Map();
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:5173",
                "https://skill-sphere-main-client-oh1p.vercel.app",
                "https://skillsphere.space",
            ],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log("🔌 Socket connected:", socket.id);
        socket.on("register", (userId) => {
            if (!userId)
                return;
            const id = userId.toString();
            users.set(id, socket.id);
            console.log("👤 Registered:", id);
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
export const emitNotification = (userId, payload) => {
    if (!io)
        return;
    const socketId = users.get(userId.toString());
    if (socketId) {
        console.log("📡 Emitting to:", userId);
        io.to(socketId).emit("notification", payload);
    }
    else {
        console.log("❌ User not connected:", userId);
    }
};
export const emitChatMessage = (userId, payload) => {
    if (!io)
        return;
    const socketId = users.get(userId.toString());
    if (socketId) {
        io.to(socketId).emit("chat:message", payload);
    }
};
export const emitWalletUpdate = (userId, payload) => {
    if (!io)
        return;
    const socketId = users.get(userId.toString());
    if (socketId) {
        io.to(socketId).emit("wallet:update", payload);
    }
};
//# sourceMappingURL=socket.js.map