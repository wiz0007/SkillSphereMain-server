import mongoose, { Schema, Document } from "mongoose";

/* ================= RATING ================= */
export interface IRating {
  user: mongoose.Types.ObjectId;
  value: number;
}

/* ================= REVIEW ================= */
export interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ================= COURSE ================= */
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

  /* ⭐ Ratings */
  ratings: IRating[];
  averageRating: number;
  totalRatings: number;

  /* ✍️ Reviews */
  reviews: IReview[];

  /* ❤️ Saved */
  savedBy: mongoose.Types.ObjectId[];
}

/* ================= SCHEMAS ================= */

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

const ReviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= MAIN COURSE ================= */

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

    /* ⭐ RATINGS */
    ratings: {
      type: [RatingSchema],
      default: [],
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    /* ✍️ REVIEWS */
    reviews: {
      type: [ReviewSchema],
      default: [],
    },

    /* ❤️ SAVE FEATURE */
    savedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", CourseSchema);