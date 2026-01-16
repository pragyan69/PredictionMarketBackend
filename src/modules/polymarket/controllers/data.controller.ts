import { Request, Response } from "express";
import { dataClient } from "../clients/data.client";
import { gammaClient } from "../clients/gamma.client";
import { clobClient } from "../clients/clob.client";

// -------------------- DATA API --------------------

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    console.log("🔥 getLeaderboard HIT", { query: req.query });

    // pass through query params if you send any later
    const leaderboard = await dataClient.getLeaderboard(req.query);

    return res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error("❌ Leaderboard controller error:", error?.message || error);
    // axios details will already be printed by interceptor
    return res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
  }
};

export const getCurrentPositions = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const data = await dataClient.getCurrentPositions(address, { limit, offset });
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getCurrentPositions failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch positions" });
  }
};

export const getMarketActivity = async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const data = await dataClient.getMarketActivity(marketId, { limit, offset });
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getMarketActivity failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch market activity" });
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const data = await dataClient.getUserActivity(address, { limit, offset });
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getUserActivity failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch user activity" });
  }
};

// -------------------- GAMMA API --------------------

export const getGammaEvents = async (_req: Request, res: Response) => {
  try {
    const events = await gammaClient.getEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch Gamma events" });
  }
};

export const getGammaEventBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const event = await gammaClient.getEventBySlug(slug);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch Gamma event" });
  }
};

export const getGammaMarkets = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const active = req.query.active !== undefined ? String(req.query.active) === "true" : undefined;
    const closed = req.query.closed !== undefined ? String(req.query.closed) === "true" : undefined;
    const archived =
      req.query.archived !== undefined ? String(req.query.archived) === "true" : undefined;

    const markets = await gammaClient.getMarkets({
      limit,
      offset,
      active,
      closed,
      archived,
    });

    res.json({ success: true, data: markets });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch Gamma markets" });
  }
};

export const getGammaMarketBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const market = await gammaClient.getMarketBySlug(slug);
    res.json({ success: true, data: market });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch Gamma market" });
  }
};

export const getGammaMarketByConditionId = async (req: Request, res: Response) => {
  try {
    const { conditionId } = req.params;
    const market = await gammaClient.getMarketByConditionId(conditionId);
    res.json({ success: true, data: market });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch Gamma market by conditionId" });
  }
};

// -------------------- CLOB API --------------------



export const getClobTrades = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const before = req.query.before ? Number(req.query.before) : undefined;
    const after = req.query.after ? Number(req.query.after) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const data = await clobClient.getPublicTrades({
      tokenId,
      before,
      after,
      limit,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getClobTrades failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch CLOB trades" });
  }
};

export const getClobOrderbook = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const data = await clobClient.getOrderBook(tokenId);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getClobOrderbook failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch CLOB orderbook" });
  }
};

export const getClobPrice = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const data = await clobClient.getPrice(tokenId);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getClobPrice failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch CLOB price" });
  }
};

export const getClobPrices = async (req: Request, res: Response) => {
  try {
    const tokenIdsParam = String(req.query.token_ids || "");
    const tokenIds = tokenIdsParam.split(",").map((s) => s.trim()).filter(Boolean);

    if (tokenIds.length === 0) {
      return res.status(400).json({ success: false, error: "token_ids query param is required" });
    }

    const data = await clobClient.getPrices(tokenIds);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("❌ Controller: getClobPrices failed:", error?.message || error);
    return res.status(500).json({ success: false, error: "Failed to fetch CLOB prices" });
  }
};

// -------------------- QUICK SMOKE TEST (optional) --------------------

export const testAllApis = async (_req: Request, res: Response) => {
  try {
    // Minimal, cheap calls
    const [events, markets, leaderboard] = await Promise.all([
      gammaClient.getEvents(),
      gammaClient.getMarkets({ limit: 1 }),
      dataClient.getLeaderboard({ limit: 1 }),
    ]);

    res.json({
      success: true,
      data: {
        gamma: { baseUrl: gammaClient.baseUrl, events_count: events.length, markets_sample: markets?.[0] },
        dataApi: { baseUrl: dataClient.baseUrl, leaderboard_sample: leaderboard?.[0] },
        clob: { baseUrl: clobClient.baseUrl, note: "Use /clob/... endpoints with a real tokenId to test trades/book" },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "API smoke test failed" });
  }
};
