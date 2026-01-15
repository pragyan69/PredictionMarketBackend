import { Router } from "express";
import { pingClickHouse } from "../config/clickhouse.ts";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const clickhouseOk = await pingClickHouse();
  res.json({
    ok: true,
    clickhouse: clickhouseOk ? "up" : "down",
    ts: new Date().toISOString()
  });
});
