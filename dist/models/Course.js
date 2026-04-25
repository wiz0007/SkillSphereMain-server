import mongoose, { Schema, Document } from "mongoose";
/* ================= SCHEMAS ================= */
const RatingSchema = new Schema({
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
}, { _id: false });
const ReviewSchema = new Schema({
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
}, {
    timestamps: true,
});
/* ================= MAIN COURSE ================= */
const CourseSchema = new Schema({
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
}, { timestamps: true });
export default mongoose.model("Course", CourseSchema);
//# sourceMappingURL=Course.js.map