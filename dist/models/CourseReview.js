import mongoose, { Document, Schema } from "mongoose";
const CourseReviewSchema = new Schema({
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
}, { timestamps: true });
CourseReviewSchema.index({ course: 1, user: 1 }, { unique: true });
export default mongoose.model("CourseReview", CourseReviewSchema);
//# sourceMappingURL=CourseReview.js.map