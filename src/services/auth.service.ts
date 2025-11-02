import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"

import { LoginInput } from "../types/auth.type";
import { env } from "../config/env";

export async function issueToken(input: LoginInput): Promise<string> {
  // ตรวจ username จาก .env
  if (input.username !== env.ADMIN_USERNAME) {
    throw new Error("Invalid credentials Username");
  }

  // ตรวจ password จาก .env (hash)
  const ok = await bcrypt.compare(input.password, env.ADMIN_PASSWORD);
  if (!ok) {
    throw new Error("Invalid credentials Password");
  }

  // ออก JWT
  return jwt.sign({ sub: input.username }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES,
  });
}
