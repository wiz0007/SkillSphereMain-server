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
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    duration: {
      type: String,
      trim: true,
    },

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