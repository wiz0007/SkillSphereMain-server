import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;

  type: "SESSION" | "PROFILE" | "TUTOR";

  action:
    | "BOOKED"
    | "ACCEPTED"
    | "COMPLETED"
    | "UPDATED"
    | "BECAME_TUTOR";

  entityId?: mongoose.Types.ObjectId;

  metadata?: any;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["SESSION", "PROFILE", "TUTOR"],
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    entityId: Schema.Types.ObjectId,

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IActivity>("Activity", ActivitySchema);