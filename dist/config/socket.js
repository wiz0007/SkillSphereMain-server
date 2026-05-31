import { Server } from "socket.io";
import jwt, {} from "jsonwebtoken";
import { AUTH_COOKIE_NAME, parseCookieHeader } from "../utils/authCookie.js";
let io;
const userSockets = new Map();
const socketUsers = new Map();
const getUserIdFromCookie = (cookieHeader) => {
    const cookies = parseCookieHeader(cookieHeader || "");
    const token = cookies[AUTH_COOKIE_NAME];
    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id || decoded.userId;
        return userId ? String(userId) : null;
    }
    catch {
        return null;
    }
};
const registerSocket = (userId, socketId) => {
    const sockets = userSockets.get(userId) || new Set();
    sockets.add(socketId);
    userSockets.set(userId, sockets);
    socketUsers.set(socketId, userId);
};
const unregisterSocket = (socketId) => {
    const userId = socketUsers.get(socketId);
    if (!userId) {
        return;
    }
    const sockets = userSockets.get(userId);
    sockets?.delete(socketId);
    if (!sockets?.size) {
        userSockets.delete(userId);
    }
    socketUsers.delete(socketId);
};
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
        const userId = getUserIdFromCookie(socket.handshake.headers.cookie);
        if (userId) {
            registerSocket(userId, socket.id);
        }
        socket.on("register", () => {
            const verifiedUserId = userId || getUserIdFromCookie(socket.handshake.headers.cookie);
            if (verifiedUserId) {
                registerSocket(verifiedUserId, socket.id);
            }
        });
        socket.on("disconnect", () => {
            unregisterSocket(socket.id);
        });
    });
};
const emitToUser = (userId, event, payload) => {
    if (!io) {
        return;
    }
    const sockets = userSockets.get(userId.toString());
    if (!sockets?.size) {
        return;
    }
    for (const socketId of sockets) {
        io.to(socketId).emit(event, payload);
    }
};
export const emitNotification = (userId, payload) => {
    emitToUser(userId, "notification", payload);
};
export const emitChatMessage = (userId, payload) => {
    emitToUser(userId, "chat:message", payload);
};
export const emitSupportMessage = (userId, payload) => {
    emitToUser(userId, "support:message", payload);
};
export const emitWalletUpdate = (userId, payload) => {
    emitToUser(userId, "wallet:update", payload);
};
//# sourceMappingURL=socket.js.map