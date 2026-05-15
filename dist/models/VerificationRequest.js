import mongoose, { Document, Schema } from "mongoose";
const VerificationRequestSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["identity", "tutor"],
        required: true,
        index: true,
    },
    provider: {
        type: String,
        enum: ["manual"],
        default: "manual",
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "resubmission_required"],
        default: "pending",
        index: true,
    },
    documentType: {
        type: String,
        default: "",
        trim: true,
        maxlength: 80,
    },
    documentFrontUrl: {
        type: String,
        default: null,
        trim: true,
    },
    documentBackUrl: {
        type: String,
        default: null,
        trim: true,
    },
    selfieUrl: {
        type: String,
        default: null,
        trim: true,
    },
    supportingDocumentUrl: {
        type: String,
        default: null,
        trim: true,
    },
    supportingDocumentName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 180,
    },
    supportingDocumentMimeType: {
        type: String,
        default: null,
        trim: true,
        maxlength: 120,
    },
    note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
    },
    reviewNote: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
VerificationRequestSchema.index({ user: 1, type: 1, createdAt: -1 });
export default mongoose.model("VerificationRequest", VerificationRequestSchema);
//# sourceMappingURL=VerificationRequest.js.map