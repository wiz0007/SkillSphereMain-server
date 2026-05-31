import type http from "http";
export declare const initSocket: (server: http.Server) => void;
export declare const emitNotification: (userId: string, payload: unknown) => void;
export declare const emitChatMessage: (userId: string, payload: unknown) => void;
export declare const emitSupportMessage: (userId: string, payload: unknown) => void;
export declare const emitWalletUpdate: (userId: string, payload: unknown) => void;
//# sourceMappingURL=socket.d.ts.map