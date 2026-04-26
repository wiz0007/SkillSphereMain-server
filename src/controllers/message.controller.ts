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

const getAllowedTutorIdsForStudent = async (studentId: string) => {
  const tutorIds = (
    await Session.find({
      student: new mongoose.Types.ObjectId(studentId),
      status: { $in: ALLOWED_CHAT_STATUSES },
    }).distinct("tutor")
  ).map((id) => id.toString());

  if (!tutorIds.length) {
    return [];
  }

  const tutorProfiles = await Profile.find({
    user: {
      $in: tutorIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
    isTutor: true,
  }).select("user");

  const allowed = new Set(
    tutorProfiles.map((profile) => profile.user.toString())
  );

  return tutorIds.filter((id) => allowed.has(id));
};

const canStudentMessageTutor = async (
  studentId: string,
  tutorId: string
) => {
  const allowedTutorIds = await getAllowedTutorIdsForStudent(studentId);
  return allowedTutorIds.includes(tutorId);
};

export const getConversations: RequestHandler = async (req, res) => {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const allowedTutorIds = await getAllowedTutorIdsForStudent(userId);

    if (!allowedTutorIds.length) {
      return res.json([]);
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: { $in: allowedTutorIds } },
        { sender: { $in: allowedTutorIds }, recipient: userId },
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
          sender: {
            $in: allowedTutorIds.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
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

    const allowed = await canStudentMessageTutor(userId, otherUserId);

    if (!allowed) {
      return res.status(403).json({
        message: "Chat is only available with tutors after acceptance",
      });
    }

    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: userId,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
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

    const allowed = await canStudentMessageTutor(userId, recipientId);

    if (!allowed) {
      return res.status(403).json({
        message: "Chat is only available with tutors after acceptance",
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

    const allowedTutorIds = await getAllowedTutorIdsForStudent(userId);

    if (!allowedTutorIds.length) {
      return res.json([]);
    }

    const sessions = await Session.find({
      student: new mongoose.Types.ObjectId(userId),
      tutor: {
        $in: allowedTutorIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
      status: { $in: ALLOWED_CHAT_STATUSES },
    })
      .populate("tutor", "username")
      .sort({ updatedAt: -1 });

    const profileMap = await buildProfileMap(allowedTutorIds);
    const usersById = new Map<string, any>();

    sessions.forEach((session: any) => {
      const tutor = session.tutor;
      const id = tutor?._id?.toString?.() || "";

      if (id && !usersById.has(id)) {
        usersById.set(id, tutor);
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
