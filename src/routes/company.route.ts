import { Router } from "express";
import { resolveCompany } from "../controllers/company.controller";
import { requireAuth } from "../libs/auth.middleware";

export const companyRouter = Router();

companyRouter.get("/v1/company/resolve", requireAuth,resolveCompany);


