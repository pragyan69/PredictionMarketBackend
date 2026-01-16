import { Router } from "express";
import {
  // Data API
  getLeaderboard,
  getCurrentPositions,
  getMarketActivity,
  getUserActivity,

  // Gamma API
  getGammaEvents,
  getGammaEventBySlug,
  getGammaMarkets,
  getGammaMarketBySlug,
  getGammaMarketByConditionId,

  // CLOB API
  getClobOrderbook,
  getClobPrice,
  getClobPrices,

  // Optional smoke test
  testAllApis,
} from "../controllers/data.controller";

const router = Router();

// -------------------- DATA API --------------------
router.get("/leaderboard", getLeaderboard);
router.get("/positions/:address", getCurrentPositions);
router.get("/market-activity/:marketId", getMarketActivity);
router.get("/user-activity/:address", getUserActivity);

// -------------------- GAMMA API --------------------
router.get("/gamma/events", getGammaEvents);
router.get("/gamma/events/:slug", getGammaEventBySlug);

router.get("/gamma/markets", getGammaMarkets);
router.get("/gamma/markets/slug/:slug", getGammaMarketBySlug);
router.get("/gamma/markets/condition/:conditionId", getGammaMarketByConditionId);

// -------------------- CLOB API --------------------
router.get("/clob/orderbook/:tokenId", getClobOrderbook);
router.get("/clob/price/:tokenId", getClobPrice);

// token_ids=123,456,789
router.get("/clob/prices", getClobPrices);

// -------------------- QUICK TEST --------------------
router.get("/test/all", testAllApis);

export default router;