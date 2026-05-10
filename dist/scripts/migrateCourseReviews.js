import "dotenv/config";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    throw new Error("MONGO_URI is required to run migrateCourseReviews");
}
const run = async () => {
    await mongoose.connect(mongoUri);
    const courses = await Course.find().lean();
    for (const course of courses) {
        const legacyRatings = Array.isArray(course.ratings)
            ? course.ratings
            : [];
        const legacyReviews = Array.isArray(course.reviews)
            ? course.reviews
            : [];
        const reviewMap = new Map();
        for (const entry of legacyRatings) {
            if (!entry?.user || typeof entry?.value !== "number") {
                continue;
            }
            reviewMap.set(String(entry.user), {
                user: new mongoose.Types.ObjectId(entry.user),
                rating: entry.value,
                comment: "",
            });
        }
        for (const entry of legacyReviews) {
            if (!entry?.user || typeof entry?.rating !== "number") {
                continue;
            }
            reviewMap.set(String(entry.user), {
                user: new mongoose.Types.ObjectId(entry.user),
                rating: entry.rating,
                comment: typeof entry.comment === "string" ? entry.comment.trim() : "",
            });
        }
        for (const value of reviewMap.values()) {
            await CourseReview.updateOne({
                course: course._id,
                user: value.user,
            }, {
                $set: {
                    rating: value.rating,
                    comment: value.comment,
                },
                $setOnInsert: {
                    course: course._id,
                    user: value.user,
                },
            }, { upsert: true });
        }
        const reviewRefs = await CourseReview.find({
            course: course._id,
        })
            .sort({ createdAt: 1, _id: 1 })
            .select("_id")
            .lean();
        const [summary] = await CourseReview.aggregate([
            {
                $match: {
                    course: course._id,
                },
            },
            {
                $group: {
                    _id: "$course",
                    totalRatings: { $sum: 1 },
                    averageRating: { $avg: "$rating" },
                },
            },
        ]);
        await Course.collection.updateOne({ _id: course._id }, {
            $set: {
                totalRatings: summary?.totalRatings || 0,
                averageRating: summary?.totalRatings
                    ? Number(summary.averageRating.toFixed(1))
                    : 0,
                reviewRefs: reviewRefs.map((entry) => entry._id),
            },
            $unset: {
                ratings: "",
                reviews: "",
            },
        });
    }
    await mongoose.disconnect();
};
run()
    .then(() => {
    console.log("Course review migration complete");
})
    .catch(async (error) => {
    console.error("Course review migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
});
//# sourceMappingURL=migrateCourseReviews.js.map