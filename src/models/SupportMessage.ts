import mongoose, { Document, Schema } from "mongoose";

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

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "support"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    attachmentUrl: {
      type: String,
      default: null,
      trim: true,
    },
    attachmentName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 180,
    },
    attachmentMimeType: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

SupportMessageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.model<ISupportMessage>(
  "SupportMessage",
  SupportMessageSchema
);
