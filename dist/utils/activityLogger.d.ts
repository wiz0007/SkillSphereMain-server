import mongoose from "mongoose";
interface LogActivityParams {
    user: string;
    type: string;
    action: string;
    entityId?: string;
    message?: string;
    metadata?: Record<string, any>;
}
export declare const logActivity: ({ user, type, action, entityId, message, metadata, }: LogActivityParams) => Promise<(mongoose.Document<unknown, {}, import("../models/Activity.js").IActivity, {}, mongoose.DefaultSchemaOptions> & import("../models/Activity.js").IActivity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | null>;
export {};
//# sourceMappingURL=activityLogger.d.ts.map