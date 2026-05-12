import mongoose, { Document, Schema } from "mongoose";

export interface IRecordedCourseAccess extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  tutor: mongoose.Types.ObjectId;
  price: number;
  skillCoinAmount: number;
  status: "pending" | "approved" | "rejected";
  coinStatus: "locked" | "settled" | "released";
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  unlockedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RecordedCourseAccessSchema = new Schema<IRecordedCourseAccess>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    skillCoinAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    coinStatus: {
      type: String,
      enum: ["locked", "settled", "released"],
      default: "locked",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    unlockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

RecordedCourseAccessSchema.index(
  { course: 1, student: 1 },
  { unique: true }
);

export default mongoose.model<IRecordedCourseAccess>(
  "RecordedCourseAccess",
  RecordedCourseAccessSchema
);
