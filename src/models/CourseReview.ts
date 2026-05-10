import mongoose, { Document, Schema } from "mongoose";

export interface ICourseReview extends Document {
  course: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CourseReviewSchema = new Schema<ICourseReview>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

CourseReviewSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model<ICourseReview>(
  "CourseReview",
  CourseReviewSchema
);
