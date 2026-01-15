import { Router } from "express";
import { healthRouter } from "./health.routes.ts";
import { polymarketRouter } from "../modules/polymarket/polymarket.routes.ts";

export const routes = Router();

routes.use("/health", healthRouter);
routes.use("/polymarket", polymarketRouter);
