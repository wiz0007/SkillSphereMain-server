import mongoose, { Document, Schema } from "mongoose";

export type SupportConversationStatus =
  | "open"
  | "waiting_on_support"
  | "waiting_on_user"
  | "resolved";

export interface ISupportConversation extends Document {
  requester: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  topic: string;
  subject: string;
  status: SupportConversationStatus;
  lastMessageAt: Date;
}

const SupportConversationSchema = new Schema<ISupportConversation>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: ["open", "waiting_on_support", "waiting_on_user", "resolved"],
      default: "open",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

SupportConversationSchema.index({ requester: 1, lastMessageAt: -1 });

export default mongoose.model<ISupportConversation>(
  "SupportConversation",
  SupportConversationSchema
);
