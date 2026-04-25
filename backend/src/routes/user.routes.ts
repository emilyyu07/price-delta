/*
User Routes:
- mounted on /api/users
- GET /api/users/me: Get current user details (requires authentication)
- PATCH /api/users/me: Update current user details (requires authentication)

Handles any profile updates/retrival for autenticated users
*/
import { Router } from "express";
import { getMe, updateUser } from "../controllers/user.controller.js"; // Import updateUser
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", protect, getMe);
router.patch("/me", protect, updateUser); // Add new PATCH route

export default router;
