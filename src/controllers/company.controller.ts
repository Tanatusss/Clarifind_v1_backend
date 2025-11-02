
import { Request, Response } from "express";
import { resolveCompanyByRegistrationId } from "../services/company.service";
import { querySchema } from "../utils/validator";

export async function resolveCompany(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const company = await resolveCompanyByRegistrationId(parsed.data.registration_id);
  if (!company) return res.status(404).json({ error: "Not found" });

  res.json({ company });
}
