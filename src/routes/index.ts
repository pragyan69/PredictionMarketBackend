import { Router } from "express";
import { healthRouter } from "./health.routes.ts";
import { polymarketRouter } from "../modules/polymarket/polymarket.routes.ts";
import { kalshiRouter } from "../modules/kalshi/kalshi.routes.ts";
import dataRoutes from '../modules/polymarket/routes/data.routes.ts';

// Trading modules
import { authRouter } from "../modules/auth/auth.routes";
import { polymarketTradingRouter } from "../modules/polymarket/routes/trading.routes";
import { kalshiTradingRouter } from "../modules/kalshi/routes/trading.routes";
import { unifiedOrdersRouter } from "../modules/unified/orders.routes";
import { portfolioRouter, balanceRouter } from "../modules/portfolio/portfolio.routes";

// DFlow module
import dflowRoutes from "../modules/dflow/routes/dflow.routes";

export const routes = Router();

// Health check
routes.use("/health", healthRouter);

// Data aggregation routes (existing)
routes.use("/polymarket", polymarketRouter);
routes.use("/kalshi", kalshiRouter);

// Authentication routes
routes.use("/auth", authRouter);

// Trading routes
routes.use("/polymarket", polymarketTradingRouter);
routes.use("/kalshi", kalshiTradingRouter);

// Unified API routes
routes.use("/orders", unifiedOrdersRouter);
routes.use("/portfolio", portfolioRouter);
routes.use("/balance", balanceRouter);

// DFlow routes
routes.use("/dflow", dflowRoutes);
