import mongoose from "mongoose";
import Message from "../models/Message.js";
import Profile from "../models/Profile.js";
import Session from "../models/Session.js";
import { emitChatMessage } from "../config/socket.js";
const ALLOWED_CHAT_STATUSES = ["accepted", "completed"];
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getId = (param) => {
    if (typeof param === "string")
        return param;
    if (Array.isArray(param) && typeof param[0] === "string")
        return param[0];
    return "";
};
const buildProfileMap = async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (!uniqueIds.length) {
        return new Map();
    }
    const profiles = await Profile.find({
        user: {
            $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
    }).select("user fullName profilePhoto isTutor");
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
        fullName: profile?.fullName || "",
        profilePhoto: profile?.profilePhoto || "",
        isTutor: profile?.isTutor || false,
    };
};
const serializeMessage = (value, currentUserId, profileMap) => ({
    _id: value._id.toString(),
    text: value.text,
    createdAt: value.createdAt,
    readAt: value.readAt || null,
    sender: serializeUser(value.sender, profileMap),
    recipient: serializeUser(value.recipient, profileMap),
    isMine: (value.sender?._id?.toString?.() || value.sender?.toString?.()) ===
        currentUserId,
});
const getViewerProfile = async (userId) => Profile.findOne({
    user: new mongoose.Types.ObjectId(userId),
}).select("user isTutor");
const getAllowedChatPartnerIds = async (userId) => {
    const viewerProfile = await getViewerProfile(userId);
    if (!viewerProfile) {
        return [];
    }
    if (viewerProfile.isTutor) {
        const studentIds = (await Session.find({
            tutor: new mongoose.Types.ObjectId(userId),
            status: { $in: ALLOWED_CHAT_STATUSES },
        }).distinct("student")).map((id) => id.toString());
        return [...new Set(studentIds)];
    }
    const tutorIds = (await Session.find({
        student: new mongoose.Types.ObjectId(userId),
        status: { $in: ALLOWED_CHAT_STATUSES },
    }).distinct("tutor")).map((id) => id.toString());
    if (!tutorIds.length) {
        return [];
    }
    const tutorProfiles = await Profile.find({
        user: {
            $in: tutorIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        isTutor: true,
    }).select("user");
    const allowedTutorIds = new Set(tutorProfiles.map((profile) => profile.user.toString()));
    return tutorIds.filter((id) => allowedTutorIds.has(id));
};
const canUserMessagePartner = async (userId, otherUserId) => {
    const allowedPartnerIds = await getAllowedChatPartnerIds(userId);
    return allowedPartnerIds.includes(otherUserId);
};
export const getConversations = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const allowedPartnerIds = await getAllowedChatPartnerIds(userId);
        if (!allowedPartnerIds.length) {
            return res.json([]);
        }
        const allowedPartnerObjectIds = allowedPartnerIds.map((id) => new mongoose.Types.ObjectId(id));
        const messages = await Message.find({
            $or: [
                {
                    sender: new mongoose.Types.ObjectId(userId),
                    recipient: { $in: allowedPartnerObjectIds },
                },
                {
                    sender: { $in: allowedPartnerObjectIds },
                    recipient: new mongoose.Types.ObjectId(userId),
                },
            ],
        })
            .populate("sender", "username")
            .populate("recipient", "username")
            .sort({ createdAt: -1 });
        const profileMap = await buildProfileMap(messages.flatMap((message) => [
            message.sender?._id?.toString?.() || "",
            message.recipient?._id?.toString?.() || "",
        ]));
        const unreadByParticipant = await Message.aggregate([
            {
                $match: {
                    recipient: new mongoose.Types.ObjectId(userId),
                    sender: { $in: allowedPartnerObjectIds },
                    readAt: null,
                },
            },
            {
                $group: {
                    _id: "$sender",
                    count: { $sum: 1 },
                },
            },
        ]);
        const unreadMap = new Map(unreadByParticipant.map((item) => [
            item._id.toString(),
            item.count,
        ]));
        const conversations = [];
        const seen = new Set();
        for (const message of messages) {
            const senderId = message.sender?._id?.toString?.() || "";
            const recipientId = message.recipient?._id?.toString?.() || "";
            const participantId = senderId === userId ? recipientId : senderId;
            if (!participantId || seen.has(participantId)) {
                continue;
            }
            seen.add(participantId);
            const participant = senderId === userId
                ? serializeUser(message.recipient, profileMap)
                : serializeUser(message.sender, profileMap);
            conversations.push({
                participant,
                unreadCount: unreadMap.get(participantId) || 0,
                lastMessage: serializeMessage(message, userId, profileMap),
            });
        }
        return res.json(conversations);
    }
    catch (error) {
        console.error("GET CONVERSATIONS ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch conversations" });
    }
};
export const getMessagesWithUser = async (req, res) => {
    try {
        const { userId } = req;
        const otherUserId = getId(req.params.userId);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(otherUserId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }
        const allowed = await canUserMessagePartner(userId, otherUserId);
        if (!allowed) {
            return res.status(403).json({
                message: "Chat is only available after a tutor accepts the booking",
            });
        }
        await Message.updateMany({
            sender: new mongoose.Types.ObjectId(otherUserId),
            recipient: new mongoose.Types.ObjectId(userId),
            readAt: null,
        }, {
            $set: { readAt: new Date() },
        });
        const messages = await Message.find({
            $or: [
                {
                    sender: new mongoose.Types.ObjectId(userId),
                    recipient: new mongoose.Types.ObjectId(otherUserId),
                },
                {
                    sender: new mongoose.Types.ObjectId(otherUserId),
                    recipient: new mongoose.Types.ObjectId(userId),
                },
            ],
        })
            .populate("sender", "username")
            .populate("recipient", "username")
            .sort({ createdAt: 1 });
        const profileMap = await buildProfileMap([userId, otherUserId]);
        return res.json(messages.map((message) => serializeMessage(message, userId, profileMap)));
    }
    catch (error) {
        console.error("GET MESSAGES ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch messages" });
    }
};
export const sendMessage = async (req, res) => {
    try {
        const { userId } = req;
        const recipientId = getId(req.params.userId);
        const text = String(req.body.text || "").trim();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!isValidObjectId(recipientId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }
        if (recipientId === userId) {
            return res
                .status(400)
                .json({ message: "You cannot message yourself" });
        }
        const allowed = await canUserMessagePartner(userId, recipientId);
        if (!allowed) {
            return res.status(403).json({
                message: "Chat is only available after a tutor accepts the booking",
            });
        }
        if (!text) {
            return res.status(400).json({ message: "Message text is required" });
        }
        const message = await Message.create({
            sender: new mongoose.Types.ObjectId(userId),
            recipient: new mongoose.Types.ObjectId(recipientId),
            text,
        });
        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username")
            .populate("recipient", "username");
        const profileMap = await buildProfileMap([userId, recipientId]);
        const payload = serializeMessage(populatedMessage, userId, profileMap);
        emitChatMessage(recipientId, payload);
        return res.status(201).json(payload);
    }
    catch (error) {
        console.error("SEND MESSAGE ERROR:", error);
        return res.status(500).json({ message: "Failed to send message" });
    }
};
export const getChatContacts = async (req, res) => {
    try {
        const { userId } = req;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const viewerProfile = await getViewerProfile(userId);
        const allowedPartnerIds = await getAllowedChatPartnerIds(userId);
        if (!viewerProfile || !allowedPartnerIds.length) {
            return res.json([]);
        }
        const partnerField = viewerProfile.isTutor ? "student" : "tutor";
        const queryField = viewerProfile.isTutor ? "tutor" : "student";
        const sessions = await Session.find({
            [queryField]: new mongoose.Types.ObjectId(userId),
            [partnerField]: {
                $in: allowedPartnerIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            status: { $in: ALLOWED_CHAT_STATUSES },
        })
            .populate(partnerField, "username")
            .sort({ updatedAt: -1 });
        const profileMap = await buildProfileMap(allowedPartnerIds);
        const usersById = new Map();
        sessions.forEach((session) => {
            const participant = session[partnerField];
            const id = participant?._id?.toString?.() || "";
            if (id && !usersById.has(id)) {
                usersById.set(id, participant);
            }
        });
        return res.json([...usersById.values()].map((value) => serializeUser(value, profileMap)));
    }
    catch (error) {
        console.error("GET CHAT CONTACTS ERROR:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch chat contacts" });
    }
};
//# sourceMappingURL=message.controller.js.map