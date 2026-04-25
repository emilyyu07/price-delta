/*
Handles logic for user authentication:
- registerUser(email, password, name?): Registers a new user and returns a JWT token
- loginUser(email, password): Authenticates a user and returns a JWT token
*/

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import "dotenv/config";

export const registerUser = async (
  email: string,
  password: string,
  name?: string,
) => {
  // Normalize email to lowercase for consistency
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    throw new Error("Email, password, and name are required.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: name?.trim() || null,
    },
    select: { id: true, email: true, name: true },
  });

  const token = jwt.sign({ userId: newUser.id }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return { token, user: newUser };
};

export const loginUser = async (email: string, password: string) => {
  // Normalize email to lowercase for case-insensitive lookup
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials.");
  }

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return { token, user: { id: user.id, email: user.email } };
};
