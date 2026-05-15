import express from "express";
import { protect } from "../middlewares/protect.js";
import { supportUpload } from "../middlewares/upload.js";
import { createSupportConversation, getSupportBootstrap, getSupportMessages, sendSupportMessage, updateSupportConversationStatus, } from "../controllers/support.controller.js";
const router = express.Router();
router.get("/", protect, getSupportBootstrap);
router.post("/", protect, supportUpload.single("attachment"), createSupportConversation);
router.get("/:conversationId/messages", protect, getSupportMessages);
router.post("/:conversationId/messages", protect, supportUpload.single("attachment"), sendSupportMessage);
router.patch("/:conversationId/status", protect, updateSupportConversationStatus);
export default router;
//# sourceMappingURL=support.routes.js.map