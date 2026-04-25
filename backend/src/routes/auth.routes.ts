/*
Authentication Routes:
- mounted on /api/auth
- POST /api/auth/login: Authenticate user and return JWT token
- POST /api/auth/register: Register a new user and return JWT token
- Rate limited to prevent brute-force attacks
*/

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { loginUser, registerUser } from "../workers/authenticator.js";

const router = Router();
const loginSchema = z.object({
  email: z.string().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registerSchema = z.object({
  email: z.string().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1, "Name is required.").max(100, "Name is too long."),
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    res.json(result);
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Authentication failed.";
    const status =
      message === "Invalid credentials."
        ? 401
        : message === "Email and password are required."
          ? 400
          : 500;

    res.status(status).json({ error: message });
  }
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      const { token, user } = await registerUser(email, password, name);
      res.status(201).json({ token, user });
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : "Registration failed.";
      const status =
        message === "An account with this email already exists." ||
        message === "Email, password, and name are required."
          ? 400
          : 500;

      res.status(status).json({ error: message });
    }
  },
);

export default router;
