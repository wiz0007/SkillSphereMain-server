import mongoose, { Document, Schema } from "mongoose";
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
    type: {
        type: String,
        enum: ["live", "recorded"],
        default: "live",
    },
    category: String,
    skills: [String],
    price: {
        type: Number,
        default: 0,
    },
    duration: String,
    contentDriveLink: {
        type: String,
        default: "",
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
}, { timestamps: true });
export default mongoose.model("Course", CourseSchema);
//# sourceMappingURL=Course.js.map