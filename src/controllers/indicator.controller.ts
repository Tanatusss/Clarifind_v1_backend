
import { Request, Response } from "express";
import { getIndicatorSummaryByRegistration } from "../services/indicator.service";
import { qSummary } from "../utils/validator";



export async function summary(req: Request, res: Response) {
  const parsed = qSummary.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const data = await getIndicatorSummaryByRegistration(parsed.data.registration_id);
  if (!data) return res.status(404).json({ error: "Not found" });

  res.json(data);
}

