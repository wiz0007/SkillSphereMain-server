import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import Profile from "../models/Profile.js";
import Session from "../models/Session.js";
import { emitChatMessage } from "../config/socket.js";

const ALLOWED_CHAT_STATUSES = ["accepted", "completed"];

const isValidObjectId = (id: string) =>
  mongoose.Types.ObjectId.isValid(id);

const getId = (param: unknown): string => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && typeof param[0] === "string") return param[0];
  return "";
};

const buildProfileMap = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map<string, any>();
  }

  const profiles = await Profile.find({
    user: {
      $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  }).select("user fullName profilePhoto isTutor");

  return new Map(
    profiles.map((profile) => [
      profile.user.toString(),
      {
        fullName: profile.fullName || "",
        profilePhoto: profile.profilePhoto || "",
        isTutor: !!profile.isTutor,
      },
    ])
  );
};

const serializeUser = (
  value: any,
  profileMap: Map<string, any>
) => {
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

const serializeMessage = (
  value: any,
  currentUserId: string,
  profileMap: Map<string, any>
) => ({
  _id: value._id.toString(),
  text: value.text,
  createdAt: value.createdAt,
  readAt: value.readAt || null,
  sender: serializeUser(value.sender, profileMap),
  recipient: serializeUser(value.recipient, profileMap),
  isMine:
    (value.sender?._id?.toString?.() || value.sender?.toString?.()) ===
    currentUserId,
});

const getAllowedChatPartnerIds = async (userId: string) => {
  const [studentIds, tutorIds] = await Promise.all([
    Session.find({
      tutor: new mongoose.Types.ObjectId(userId),
      status: { $in: ALLOWED_CHAT_STATUSES },
    }).distinct("student"),
    Session.find({
      student: new mongoose.Types.ObjectId(userId),
      status: { $in: ALLOWED_CHAT_STATUSES },
    }).distinct("tutor"),
  ]);

  return [
    ...new Set(
      [...studentIds, ...tutorIds]
        .map((id) => id.toString())
        .filter((id) => id && id !== userId)
    ),
  ];
};

const canUserMessagePartner = async (
  userId: string,
  otherUserId: string
) => {
  const allowedPartnerIds = await getAllowedChatPartnerIds(userId);
  return allowedPartnerIds.includes(otherUserId);
};

export const getConversations: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allowedPartnerIds = await getAllowedChatPartnerIds(userId);

    if (!allowedPartnerIds.length) {
      return res.json([]);
    }

    const allowedPartnerObjectIds = allowedPartnerIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

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

    const profileMap = await buildProfileMap(
      messages.flatMap((message) => [
        message.sender?._id?.toString?.() || "",
        message.recipient?._id?.toString?.() || "",
      ])
    );

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

    const unreadMap = new Map(
      unreadByParticipant.map((item) => [
        item._id.toString(),
        item.count,
      ])
    );

    const conversations: Array<any> = [];
    const seen = new Set<string>();

    for (const message of messages) {
      const senderId = message.sender?._id?.toString?.() || "";
      const recipientId = message.recipient?._id?.toString?.() || "";
      const participantId =
        senderId === userId ? recipientId : senderId;

      if (!participantId || seen.has(participantId)) {
        continue;
      }

      seen.add(participantId);

      const participant =
        senderId === userId
          ? serializeUser(message.recipient, profileMap)
          : serializeUser(message.sender, profileMap);

      conversations.push({
        participant,
        unreadCount: unreadMap.get(participantId) || 0,
        lastMessage: serializeMessage(message, userId, profileMap),
      });
    }

    return res.json(conversations);
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch conversations" });
  }
};

export const getMessagesWithUser: RequestHandler = async (req, res) => {
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

    await Message.updateMany(
      {
        sender: new mongoose.Types.ObjectId(otherUserId),
        recipient: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

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

    return res.json(
      messages.map((message) =>
        serializeMessage(message, userId, profileMap)
      )
    );
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch messages" });
  }
};

export const sendMessage: RequestHandler = async (req, res) => {
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
    const senderPayload = serializeMessage(
      populatedMessage,
      userId,
      profileMap
    );
    const recipientPayload = serializeMessage(
      populatedMessage,
      recipientId,
      profileMap
    );

    emitChatMessage(recipientId, recipientPayload);

    return res.status(201).json(senderPayload);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

export const getChatContacts: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allowedPartnerIds = await getAllowedChatPartnerIds(userId);

    if (!allowedPartnerIds.length) {
      return res.json([]);
    }

    const sessions = await Session.find({
      status: { $in: ALLOWED_CHAT_STATUSES },
      $or: [
        {
          tutor: new mongoose.Types.ObjectId(userId),
          student: {
            $in: allowedPartnerIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        {
          student: new mongoose.Types.ObjectId(userId),
          tutor: {
            $in: allowedPartnerIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      ],
    })
      .populate("student", "username")
      .populate("tutor", "username")
      .sort({ updatedAt: -1 });

    const profileMap = await buildProfileMap(allowedPartnerIds);
    const usersById = new Map<string, any>();

    sessions.forEach((session: any) => {
      const tutorId = session.tutor?._id?.toString?.() || "";
      const studentId = session.student?._id?.toString?.() || "";
      const participant =
        tutorId === userId ? session.student : session.tutor;
      const id = participant?._id?.toString?.() || "";

      if (id && !usersById.has(id)) {
        usersById.set(id, participant);
      }
    });

    return res.json(
      [...usersById.values()].map((value) =>
        serializeUser(value, profileMap)
      )
    );
  } catch (error) {
    console.error("GET CHAT CONTACTS ERROR:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch chat contacts" });
  }
};
