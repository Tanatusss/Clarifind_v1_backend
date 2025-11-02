// src/controllers/indicators.controller.ts
import { Request, Response } from "express";
import { z } from "zod";
import { getIndicatorDetails } from "../services/index.indicators";

const q = z.object({
  registration_id: z.string().min(5),
  code: z.string().min(1).max(10),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export async function indicatorDetails(req: Request, res: Response) {
  const parsed = q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { registration_id, code, skip, take } = parsed.data;
  const data = await getIndicatorDetails(registration_id, code, skip, take);
  if (!data.company) return res.status(404).json({ error: "Company not found" });

  res.json({ ...data, meta: { queried_at: new Date().toISOString() } });
}
