import { Router } from "express";
import { requireAuth } from "../libs/auth.middleware";
import { resolveCompany, suggestCompanies } from "../controllers/company.controller";

export const companyRouter = Router();

companyRouter.get("/v1/company/resolve", requireAuth, resolveCompany);
companyRouter.get("/v1/company/suggest", suggestCompanies)