import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId; // who receives notification

  type: "SESSION" | "COURSE" | "SYSTEM";

  action: string; // REQUESTED, ACCEPTED, CANCELLED, etc.

  entityId?: mongoose.Types.ObjectId;

  metadata?: Record<string, any>;

  message: string;

  isRead: boolean;

  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },



    type: {
      type: String,
      enum: ["SESSION", "COURSE", "SYSTEM"],
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    message: { type: String, required: true },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IActivity>("Activity", ActivitySchema);