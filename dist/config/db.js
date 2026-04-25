import mongoose from "mongoose";
export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    }
    catch (error) {
        console.error("DB Connection Failed", error);
        process.exit(1);
    }
}
//# sourceMappingURL=db.js.map