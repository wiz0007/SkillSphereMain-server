import mongoose, { Schema, Document } from "mongoose";

/* ⭐ RATING SUBDOC */
export interface IRating {
  user: mongoose.Types.ObjectId;
  value: number;
}

/* COURSE */
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

  /* ⭐ NEW */
  ratings: IRating[];
  averageRating: number;
  totalRatings: number;
}

const RatingSchema = new Schema<IRating>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false }
);

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
    },

    description: String,

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

    /* ⭐ NEW FIELDS */
    ratings: [RatingSchema],

    averageRating: {
      type: Number,
      default: 0,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", CourseSchema);