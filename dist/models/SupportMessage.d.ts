import mongoose, { Document } from "mongoose";
export type SupportSenderRole = "user" | "support";
export interface ISupportMessage extends Document {
    conversation: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    senderRole: SupportSenderRole;
    text: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMimeType?: string | null;
    readAt?: Date | null;
}
declare const _default: mongoose.Model<ISupportMessage, {}, {}, {}, mongoose.Document<unknown, {}, ISupportMessage, {}, mongoose.DefaultSchemaOptions> & ISupportMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISupportMessage>;
export default _default;
//# sourceMappingURL=SupportMessage.d.ts.map