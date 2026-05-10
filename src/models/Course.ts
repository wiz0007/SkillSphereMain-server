import mongoose, { Document, Schema } from "mongoose";

export interface ICourse extends Document {
  tutor: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  skills: string[];
  price: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  isPublished: boolean;
  averageRating: number;
  totalRatings: number;
  reviewRefs: mongoose.Types.ObjectId[];
  savedBy: mongoose.Types.ObjectId[];
}

const CourseSchema = new Schema<ICourse>(
  {
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: String,
    skills: [String],
    price: {
      type: Number,
      default: 0,
    },
    duration: String,
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    reviewRefs: {
      type: [Schema.Types.ObjectId],
      ref: "CourseReview",
      default: [],
    },
    savedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", CourseSchema);
