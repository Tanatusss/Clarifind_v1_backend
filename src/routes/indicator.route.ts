// src/routes/indicators.route.ts
import { Router } from "express";

import { requireAuth } from "../libs/auth.middleware";
import {summary } from "../controllers/indicator.controller";
import { indicatorDetails } from "../controllers/typeindicators.controller";


export const indicatorRouter = Router();

indicatorRouter.get("/v1/indicators/summary", requireAuth, summary);
indicatorRouter.get("/v1/indicator/details", requireAuth,indicatorDetails);
