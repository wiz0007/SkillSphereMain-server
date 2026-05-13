import type { RequestHandler } from "express";
export declare const syncAdminAccess: (userId: string) => Promise<(import("mongoose").Document<unknown, {}, import("../models/User.js").IUser, {}, import("mongoose").DefaultSchemaOptions> & import("../models/User.js").IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | null>;
export declare const adminOnly: RequestHandler;
//# sourceMappingURL=adminOnly.d.ts.map