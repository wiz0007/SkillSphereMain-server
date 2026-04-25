import mongoose, { Document } from "mongoose";
export interface IActivity extends Document {
    user: mongoose.Types.ObjectId;
    type: "SESSION" | "COURSE" | "SYSTEM";
    action: string;
    entityId?: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
    message: string;
    isRead: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<IActivity, {}, {}, {}, mongoose.Document<unknown, {}, IActivity, {}, mongoose.DefaultSchemaOptions> & IActivity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IActivity>;
export default _default;
//# sourceMappingURL=Activity.d.ts.map