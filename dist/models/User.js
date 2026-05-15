import mongoose, { Document, Schema } from "mongoose";
const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    profileCompleted: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    identityVerificationStatus: {
        type: String,
        enum: [
            "not_started",
            "pending",
            "approved",
            "rejected",
            "resubmission_required",
        ],
        default: "not_started",
    },
    tutorVerificationStatus: {
        type: String,
        enum: [
            "not_started",
            "pending",
            "approved",
            "rejected",
            "resubmission_required",
        ],
        default: "not_started",
    },
    verifiedBadgeLevel: {
        type: String,
        enum: ["none", "basic", "identity", "tutor"],
        default: "none",
    },
    /* OTP */
    otp: String,
    otpExpires: Date,
    /* 🔐 SECURITY */
    otpAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,
    isAdmin: {
        type: Boolean,
        default: false,
    },
    skillCoinBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    lockedSkillCoins: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { timestamps: true });
export default mongoose.model("User", UserSchema);
//# sourceMappingURL=User.js.map