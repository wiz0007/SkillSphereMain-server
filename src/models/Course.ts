import mongoose, { Schema, Document } from "mongoose";

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
}

const CourseSchema = new Schema<ICourse>(
  {
    tutor: {
      type: Schema.Types.ObjectId,
      ref: "User", // or Profile (explained below)
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
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
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", CourseSchema);