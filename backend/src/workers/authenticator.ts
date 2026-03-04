import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;

export const registerUser = async (email: string, password: string) => {
  if (!JWT_SECRET) {
    throw new Error("Internal servor issue: JWT Secret is missing.");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword },
    select: { id: true, email: true },
  });

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
    expiresIn: "1h",
  });
  return { token, user: newUser };
};

export const loginUser = async (email: string, password: string) => {
  if (!JWT_SECRET) {
    throw new Error("Internal servor issue: JWT Secret is missing.");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials.");
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
  return { token, user: { id: user.id, email: user.email } };
};
