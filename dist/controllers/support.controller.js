import mongoose from "mongoose";
import Profile from "../models/Profile.js";
import SupportConversation from "../models/SupportConversation.js";
import SupportMessage from "../models/SupportMessage.js";
import User from "../models/User.js";
import { emitSupportMessage } from "../config/socket.js";
const SUPPORT_TOPICS = [
    "Payment issue",
    "SkillCoin wallet",
    "Session booking",
    "Messages and chat",
    "Reviews and ratings",
    "Account and profile",
    "Other",
];
const getId = (param) => {
    if (typeof param === "string")
        return param;
    if (Array.isArray(param) && typeof param[0] === "string")
        return param[0];
    return "";
};
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getSupportExecutiveEmails = () => String(process.env.SUPPORT_EXECUTIVE_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
const isSupportExecutive = async (userId) => {
    const emails = getSupportExecutiveEmails();
    if (!emails.length) {
        return false;
    }
    const user = await User.findById(userId).select("email").lean();
    if (!user?.email) {
        return false;
    }
    return emails.includes(user.email.toLowerCase());
};
const getProfileMap = async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueIds.length) {
        return new Map();
    }
    const profiles = await Profile.find({
        user: {
            $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
    })
        .select("user fullName profilePhoto isTutor")
        .lean();
    return new Map(profiles.map((profile) => [
        profile.user.toString(),
        {
            fullName: profile.fullName || "",
            profilePhoto: profile.profilePhoto || "",
            isTutor: !!profile.isTutor,
        },
    ]));
};
const serializeUser = (value, profileMap) => {
    const id = value?._id?.toString?.() || value?.toString?.() || "";
    const profile = profileMap.get(id);
    return {
        _id: id,
        username: value?.username || "",
        email: value?.email || "",
        fullName: profile?.fullName || "",
        profilePhoto: profile?.profilePhoto || "",
        isTutor: profile?.isTutor || false,
    };
};
const serializeConversation = (conversation, profileMap) => ({
    _id: conversation._id.toString(),
    topic: conversation.topic,
    subject: conversation.subject,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    requester: serializeUser(conversation.requester, profileMap),
    assignedTo: conversation.assignedTo
        ? serializeUser(conversation.assignedTo, profileMap)
        : null,
});
const serializeMessage = (message, currentUserId, profileMap) => ({
    _id: message._id.toString(),
    text: message.text,
    createdAt: message.createdAt,
    readAt: message.readAt || null,
    senderRole: message.senderRole,
    sender: serializeUser(message.sender, profileMap),
    isMine: (message.sender?._id?.toString?.() || message.sender?.toString?.()) ===
        currentUserId,
});
const getFirstAvailableExecutiveId = async () => {
    const emails = getSupportExecutiveEmails();
    if (!emails.length) {
        return null;
    }
    const executive = await User.findOne({
        email: { $in: emails },
    })
        .sort({ createdAt: 1 })
        .select("_id")
        .lean();
    return executive?._id?.toString?.() || null;
};
const markConversationRead = async (conversationId, viewerId) => {
    await SupportMessage.updateMany({
        conversation: new mongoose.Types.ObjectId(conversationId),
        sender: { $ne: new mongoose.Types.ObjectId(viewerId) },
        readAt: null,
    }, {
        $set: { readAt: new Date() },
    });
};
const getConversationOrThrow = async (conversationId, userId) => {
    const executive = await isSupportExecutive(userId);
    const conversation = await SupportConversation.findById(conversationId)
        .populate("requester", "username email")
        .populate("assignedTo", "username email");
    if (!conversation) {
        return { executive, conversation: null };
    }
    const requesterId = conversation.requester?._id?.toString?.() ||
        conversation.requester?.toString?.() ||
        "";
    const assignedId = conversation.assignedTo?._id?.toString?.() ||
        conversation.assignedTo?.toString?.() ||
        "";
    const allowed = executive || requesterId === userId || assignedId === userId;
    if (!allowed) {
        return { executive, conversation: null };
    }
    return { executive, conversation };
};
export const getSupportBootstrap = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const executive = await isSupportExecutive(userId);
        const query = executive
            ? {}
            : { requester: new mongoose.Types.ObjectId(userId) };
        const conversations = await SupportConversation.find(query)
            .populate("requester", "username email")
            .populate("assignedTo", "username email")
            .sort({ lastMessageAt: -1 });
        const participantIds = conversations.flatMap((conversation) => [
            conversation.requester?._id?.toString?.() || "",
            conversation.assignedTo?._id?.toString?.() || "",
        ]);
        const profileMap = await getProfileMap(participantIds);
        const unread = await SupportMessage.aggregate([
            {
                $match: {
                    conversation: {
                        $in: conversations.map((conversation) => conversation._id),
                    },
                    sender: { $ne: new mongoose.Types.ObjectId(userId) },
                    readAt: null,
                },
            },
            {
                $group: {
                    _id: "$conversation",
                    count: { $sum: 1 },
                },
            },
        ]);
        const unreadMap = new Map(unread.map((item) => [item._id.toString(), item.count]));
        return res.json({
            isExecutive: executive,
            topics: SUPPORT_TOPICS,
            conversations: conversations.map((conversation) => ({
                ...serializeConversation(conversation, profileMap),
                unreadCount: unreadMap.get(conversation._id.toString()) || 0,
            })),
        });
    }
    catch (error) {
        console.error("GET SUPPORT BOOTSTRAP ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch support inbox" });
    }
};
export const createSupportConversation = async (req, res) => {
    try {
        const { userId } = req;
        const topic = String(req.body.topic || "").trim();
        const subject = String(req.body.subject || "").trim();
        const text = String(req.body.text || "").trim();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!topic || !subject || !text) {
            return res.status(400).json({
                message: "Topic, subject, and message are required",
            });
        }
        const assignedTo = await getFirstAvailableExecutiveId();
        const conversation = await SupportConversation.create({
            requester: new mongoose.Types.ObjectId(userId),
            assignedTo: assignedTo
                ? new mongoose.Types.ObjectId(assignedTo)
                : null,
            topic,
            subject,
            status: assignedTo ? "waiting_on_support" : "open",
            lastMessageAt: new Date(),
        });
        const message = await SupportMessage.create({
            conversation: conversation._id,
            sender: new mongoose.Types.ObjectId(userId),
            senderRole: "user",
            text,
        });
        const populatedConversation = await SupportConversation.findById(conversation._id)
            .populate("requester", "username email")
            .populate("assignedTo", "username email");
        const populatedMessage = await SupportMessage.findById(message._id).populate("sender", "username email");
        const profileMap = await getProfileMap([
            userId,
            assignedTo || "",
        ]);
        const conversationPayload = serializeConversation(populatedConversation, profileMap);
        const messagePayload = serializeMessage(populatedMessage, userId, profileMap);
        if (assignedTo) {
            emitSupportMessage(assignedTo, {
                conversation: conversationPayload,
                message: messagePayload,
            });
        }
        return res.status(201).json({
            conversation: {
                ...conversationPayload,
                unreadCount: 0,
            },
            message: messagePayload,
        });
    }
    catch (error) {
        console.error("CREATE SUPPORT CONVERSATION ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to create support conversation" });
    }
};
export const getSupportMessages = async (req, res) => {
    try {
        const { userId } = req;
        const conversationId = getId(req.params.conversationId);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(conversationId)) {
            return res
                .status(400)
                .json({ message: "Invalid conversationId" });
        }
        const { conversation } = await getConversationOrThrow(conversationId, userId);
        if (!conversation) {
            return res.status(404).json({
                message: "Support conversation not found",
            });
        }
        await markConversationRead(conversation._id, userId);
        const messages = await SupportMessage.find({
            conversation: conversation._id,
        })
            .populate("sender", "username email")
            .sort({ createdAt: 1 });
        const profileMap = await getProfileMap(messages.map((message) => message.sender?._id?.toString?.() || ""));
        return res.json(messages.map((message) => serializeMessage(message, userId, profileMap)));
    }
    catch (error) {
        console.error("GET SUPPORT MESSAGES ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch support messages" });
    }
};
export const sendSupportMessage = async (req, res) => {
    try {
        const { userId } = req;
        const conversationId = getId(req.params.conversationId);
        const text = String(req.body.text || "").trim();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(conversationId)) {
            return res
                .status(400)
                .json({ message: "Invalid conversationId" });
        }
        if (!text) {
            return res.status(400).json({ message: "Message text is required" });
        }
        const { executive, conversation } = await getConversationOrThrow(conversationId, userId);
        if (!conversation) {
            return res.status(404).json({
                message: "Support conversation not found",
            });
        }
        const senderRole = executive ? "support" : "user";
        const nextStatus = executive
            ? "waiting_on_user"
            : "waiting_on_support";
        const message = await SupportMessage.create({
            conversation: conversation._id,
            sender: new mongoose.Types.ObjectId(userId),
            senderRole,
            text,
        });
        conversation.status = nextStatus;
        conversation.lastMessageAt = new Date();
        if (executive && !conversation.assignedTo) {
            conversation.assignedTo = new mongoose.Types.ObjectId(userId);
        }
        await conversation.save();
        const populatedMessage = await SupportMessage.findById(message._id).populate("sender", "username email");
        const populatedConversation = await SupportConversation.findById(conversation._id)
            .populate("requester", "username email")
            .populate("assignedTo", "username email");
        const requesterId = populatedConversation?.requester?._id?.toString?.() ||
            populatedConversation?.requester?.toString?.() ||
            "";
        const assignedId = populatedConversation?.assignedTo?._id?.toString?.() ||
            populatedConversation?.assignedTo?.toString?.() ||
            "";
        const profileMap = await getProfileMap([
            userId,
            requesterId,
            assignedId,
        ]);
        const payload = serializeMessage(populatedMessage, userId, profileMap);
        const conversationPayload = serializeConversation(populatedConversation, profileMap);
        const recipients = [requesterId, assignedId].filter((id) => id && id !== userId);
        recipients.forEach((recipientId) => {
            emitSupportMessage(recipientId, {
                conversation: conversationPayload,
                message: payload,
            });
        });
        return res.status(201).json({
            conversation: conversationPayload,
            message: payload,
        });
    }
    catch (error) {
        console.error("SEND SUPPORT MESSAGE ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to send support message" });
    }
};
export const updateSupportConversationStatus = async (req, res) => {
    try {
        const { userId } = req;
        const conversationId = getId(req.params.conversationId);
        const status = String(req.body.status || "").trim();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(conversationId)) {
            return res
                .status(400)
                .json({ message: "Invalid conversationId" });
        }
        if (!["open", "waiting_on_support", "waiting_on_user", "resolved"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const { executive, conversation } = await getConversationOrThrow(conversationId, userId);
        if (!conversation) {
            return res.status(404).json({
                message: "Support conversation not found",
            });
        }
        const requesterId = conversation.requester?._id?.toString?.() ||
            conversation.requester?.toString?.() ||
            "";
        if (!executive && requesterId !== userId) {
            return res.status(403).json({
                message: "Only support executives or the requester can update status",
            });
        }
        if (!executive && status !== "resolved" && status !== "open") {
            return res.status(403).json({
                message: "Requesters can only reopen or resolve conversations",
            });
        }
        conversation.status = status;
        await conversation.save();
        const assignedId = conversation.assignedTo?._id?.toString?.() ||
            conversation.assignedTo?.toString?.() ||
            "";
        const profileMap = await getProfileMap([requesterId, assignedId]);
        return res.json(serializeConversation(conversation, profileMap));
    }
    catch (error) {
        console.error("UPDATE SUPPORT STATUS ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to update support status" });
    }
};
//# sourceMappingURL=support.controller.js.map