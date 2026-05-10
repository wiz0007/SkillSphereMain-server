import mongoose, { Document } from "mongoose";
export type SupportConversationStatus = "open" | "waiting_on_support" | "waiting_on_user" | "resolved";
export interface ISupportConversation extends Document {
    requester: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId | null;
    topic: string;
    subject: string;
    status: SupportConversationStatus;
    lastMessageAt: Date;
}
declare const _default: mongoose.Model<ISupportConversation, {}, {}, {}, mongoose.Document<unknown, {}, ISupportConversation, {}, mongoose.DefaultSchemaOptions> & ISupportConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISupportConversation>;
export default _default;
//# sourceMappingURL=SupportConversation.d.ts.map