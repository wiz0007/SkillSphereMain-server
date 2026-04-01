import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  student: mongoose.Types.ObjectId;
  tutor: mongoose.Types.ObjectId;

  title: string;
  description?: string;

  date: Date;
  duration: number; // in minutes

  status: "pending" | "accepted" | "completed" | "cancelled";

  price: number;
}

const SessionSchema = new Schema<ISession>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    description: String,

    date: { type: Date, required: true },
    duration: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
    },

    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISession>("Session", SessionSchema);