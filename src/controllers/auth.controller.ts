import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { generateOTP } from "../utils/generateOtp.js";
import { sendOTPEmail } from "../utils/sendEmail.js";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

const toSafeUser = (
  user: Record<string, any>,
  profile?: {
    isTutor?: boolean | undefined;
    profilePhoto?: string | undefined;
  }
) => {
  const {
    password,
    otp,
    otpExpires,
    otpAttempts,
    lockUntil,
    __v,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    isTutor: profile?.isTutor || false,
    profilePhoto: profile?.profilePhoto || "",
  };
};

export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Weak password" });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      otp: await bcrypt.hash(otp, 10),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
    });

    sendOTPEmail(email, otp)
      .then(() => {
        console.log("OTP email sent to:", email);
      })
      .catch((err) => {
        console.error("EMAIL FAILED:", err.message);
      });

    return res.status(201).json({
      message: "Account created. OTP sent to email.",
      userId: user._id,
    });

  } catch (err: any) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Account temporarily locked. Try later.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const profile = await Profile.findOne({ user: user._id });

    return res.json({
      token: generateToken(user._id.toString()),
      user: toSafeUser(user.toObject(), {
        isTutor: profile?.isTutor,
        profilePhoto: profile?.profilePhoto,
      }),
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

export const verifyOTP: RequestHandler = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Too many attempts. Try later.",
      });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const match = await bcrypt.compare(otp, user.otp);

    if (!match) {
      user.otpAttempts += 1;

      if (user.otpAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.otpAttempts = 0;
      }

      await user.save();

      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.lockUntil = null;

    await user.save();

    return res.json({ message: "Verified successfully" });

  } catch {
    return res.status(500).json({ message: "Verification failed" });
  }
};

export const resendOTP: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Account locked. Try later.",
      });
    }

    const otp = generateOTP();

    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;

    await user.save();

    await sendOTPEmail(user.email, otp);

    return res.json({ message: "OTP resent" });

  } catch {
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
};

export const checkUsername: RequestHandler = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ message: "Username required" });
    }

    const exists = await User.findOne({ username });

    return res.json({ available: !exists });

  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};
