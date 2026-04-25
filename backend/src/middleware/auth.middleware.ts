/*
Authentication Middleware: 
- Verifies JWT tokens
- retrieves user info from database
- protects routes that require authentication
*/
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import "dotenv/config";

interface JwtPayload {
  userId: string;
}

export interface UserPayload {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const headerToken =
    req.headers.authorization && req.headers.authorization.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : undefined;
  const queryToken =
    typeof req.query.token === "string" ? req.query.token : undefined;
  const token = headerToken ?? queryToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      (req as AuthRequest).user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
