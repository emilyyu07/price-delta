/*
Handles user authentication, profile retrieval, and profile updates
*/
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import prisma from "../config/prisma.js";

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }
  res.status(200).json(req.user);
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: Function,
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }
    const { id } = req.user; // Get user ID from authenticated request
    const { name } = req.body; // Get name from request body

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, email: true, name: true }, // Select fields to return
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};
