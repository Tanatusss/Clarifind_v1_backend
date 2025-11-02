import { Router } from "express";
import { loginController } from "../controllers/auth.controller";

export const authRouter = Router();

// POST /auth/login
authRouter.post("/login", loginController);
