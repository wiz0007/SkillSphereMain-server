import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d"
  });
};

/* ================= REGISTER ================= */

export const register = async (req: Request, res: Response) => {
  try {

    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      token: generateToken(user._id.toString()),
      user
    });

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Registration failed"
    });

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