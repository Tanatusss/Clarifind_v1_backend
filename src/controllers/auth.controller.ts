import { Request, Response } from "express";
import { issueToken } from "../services/auth.service";
import { LoginSchema } from "../utils/auth.schema";

export async function loginController(req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten(i => i.message);
    return res.status(400).json({ error: { fieldErrors, formErrors } });
  }

  try {
    const token = await issueToken(parsed.data);
    return res.json({ token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return res.status(401).json({ error: message });
  }
}
