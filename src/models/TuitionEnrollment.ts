import mongoose, { Document, Schema } from "mongoose";

export interface ITuitionEnrollment extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  tutor: mongoose.Types.ObjectId;
  price: number;
  skillCoinAmount: number;
  status: "pending" | "approved" | "paused" | "rejected" | "cancelled";
  coinStatus: "locked" | "settled" | "released";
  generatedUntil?: Date | null;
  approvedAt?: Date | null;
  pausedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
  scheduleSnapshot: {
    days: string[];
    weeks: number[];
    startTime: string;
    duration: string;
    durationMinutes: number;
  };
}

const TuitionScheduleSnapshotSchema = new Schema(
  {
    days: {
      type: [String],
      default: [],
    },
    weeks: {
      type: [Number],
      default: [],
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
    },
    duration: {
      type: String,
      default: "",
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const TuitionEnrollmentSchema = new Schema<ITuitionEnrollment>(
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
      enum: ["pending", "approved", "paused", "rejected", "cancelled"],
      default: "pending",
    },
    coinStatus: {
      type: String,
      enum: ["locked", "settled", "released"],
      default: "locked",
    },
    generatedUntil: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    scheduleSnapshot: {
      type: TuitionScheduleSnapshotSchema,
      required: true,
    },
  },
  { timestamps: true }
);

TuitionEnrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

export default mongoose.model<ITuitionEnrollment>(
  "TuitionEnrollment",
  TuitionEnrollmentSchema
);
