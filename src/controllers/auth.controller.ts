import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { generateOTP } from "../utils/generateOtp.js";
import { sendOTPEmail } from "../utils/sendEmail.js";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d"
  });
};

/* ================= REGISTER ================= */




export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 🔒 Strong password
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Weak password",
      });
    }

    // ✅ Check duplicates
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
      otpExpires: Date.now() + 10 * 60 * 1000,
    });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: "OTP sent",
      userId: user._id,
    });

  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};
/* ================= LOGIN ================= */

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });


    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 🔥 GET PROFILE
    const profile = await Profile.findOne({ user: user._id });


    res.json({
      token: generateToken(user._id.toString()),
      user: {
        ...user.toObject(),
        isTutor: profile?.isTutor || false,
        profilePhoto: profile?.profilePhoto || "", // ✅ ADD THIS
      },
    });

  } catch (error) {
    res.status(500).json({
      message: "Login failed",
    });
  }
};


export const verifyOTP = async (req: Request, res: Response) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);

  if (!user || !user.otp) {
    return res.status(400).json({ message: "Invalid request" });
  }

  if (user.otpExpires! < new Date()) {
    return res.status(400).json({ message: "OTP expired" });
  }

  const match = await bcrypt.compare(otp, user.otp);

  if (!match) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  res.json({ message: "Verified successfully" });
};

// controller
export const checkUsername = async (req: Request, res: Response) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  const exists = await User.findOne({ username });

  res.json({ available: !exists });
};