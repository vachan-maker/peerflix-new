import { Router } from "express";
import {
  register,
  login,
  logout,
  getCurrentUser,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const authRouter = Router();

// POST route for user registration (public)
authRouter.post("/register", register);

// POST route for user login (public)
authRouter.post("/login", login);

// POST route for user logout (public - just clears cookie)
authRouter.post("/logout", logout);

// GET route for current user (authenticated)
authRouter.get("/me", requireAuth, getCurrentUser);

export default authRouter;
