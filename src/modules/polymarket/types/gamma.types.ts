// src/modules/polymarket/types/gamma.types.ts

// ============================================
// Gamma API Response Types
// Base URL: https://gamma-api.polymarket.com
// ============================================

// Image optimization info (nested in events/markets)
export interface ImageOptimized {
  id?: string;
  imageUrlSource?: string;
  imageUrlOptimized?: string;
  imageSizeKbSource?: number;
  imageSizeKbOptimized?: number;
  imageOptimizedComplete?: boolean;
  imageOptimizedLastUpdated?: string;
  relID?: number;
  field?: string;
  relname?: string;
}

// Category info
export interface GammaCategory {
  id: string;
  label: string;
  parentCategory?: string;
  slug: string;
  publishedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tag info
export interface GammaTag {
  id: string;
  label: string;
  slug: string;
  forceShow?: boolean;
  forceHide?: boolean;
  isCarousel?: boolean;
  publishedAt?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

// GET /events and GET /events/slug/{slug}
export interface GammaEvent {
  id: string;
  ticker?: string | null;
  slug?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  resolutionSource?: string | null;
  startDate?: string | null;      // ISO 8601
  creationDate?: string | null;
  endDate?: string | null;
  image?: string | null;
  icon?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  archived?: boolean | null;
  new?: boolean | null;
  featured?: boolean | null;
  restricted?: boolean | null;
  liquidity?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  sortBy?: string | null;
  category?: string | null;
  subcategory?: string | null;
  isTemplate?: boolean | null;
  templateVariables?: string | null;
  published_at?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  commentsEnabled?: boolean | null;
  competitive?: number | null;
  volume24hr?: number | null;
  volume1wk?: number | null;
  volume1mo?: number | null;
  volume1yr?: number | null;
  featuredImage?: string | null;
  disqusThread?: string | null;
  parentEvent?: string | null;
  enableOrderBook?: boolean | null;
  liquidityAmm?: number | null;
  liquidityClob?: number | null;
  negRisk?: boolean | null;
  negRiskMarketID?: string | null;
  negRiskFeeBips?: number | null;
  commentCount?: number | null;
  imageOptimized?: ImageOptimized | null;
  iconOptimized?: ImageOptimized | null;
  featuredImageOptimized?: ImageOptimized | null;
  subEvents?: string[] | null;
  markets?: GammaMarket[];
  series?: any[];
  categories?: GammaCategory[];
  collections?: any[];
  tags?: GammaTag[];
  cyom?: boolean | null;
  closedTime?: string | null;
  showAllOutcomes?: boolean | null;
  showMarketImages?: boolean | null;
  automaticallyResolved?: boolean | null;
  enableNegRisk?: boolean | null;
  automaticallyActive?: boolean | null;
  eventDate?: string | null;
  startTime?: string | null;
  eventWeek?: number | null;
  seriesSlug?: string | null;
  score?: string | null;
  elapsed?: string | null;
  period?: string | null;
  live?: boolean | null;
  ended?: boolean | null;
  finishedTimestamp?: string | null;
  gmpChartMode?: string | null;
  eventCreators?: any[];
  tweetCount?: number | null;
  chats?: any[];
  featuredOrder?: number | null;
  estimateValue?: boolean | null;
  cantEstimate?: boolean | null;
  estimatedValue?: string | null;
  templates?: any[];
  spreadsMainLine?: number | null;
  totalsMainLine?: number | null;
  carouselMap?: string | null;
  pendingDeployment?: boolean | null;
  deploying?: boolean | null;
  deployingTimestamp?: string | null;
  scheduledDeploymentTimestamp?: string | null;
  gameStatus?: string | null;
}

// GET /markets
// NOTE: outcomes, outcomePrices, clobTokenIds come as JSON strings from API!
export interface GammaMarket {
  id: string;
  question?: string;
  conditionId?: string;
  slug?: string;
  twitterCardImage?: string;
  resolutionSource?: string;
  endDate?: string;            // ISO 8601
  category?: string;
  ammType?: string;
  liquidity?: string;          // String in API
  sponsorName?: string;
  sponsorImage?: string;
  startDate?: string;
  xAxisValue?: string;
  yAxisValue?: string;
  denominationToken?: string;
  fee?: string;
  image?: string;
  icon?: string;
  lowerBound?: string;
  upperBound?: string;
  description?: string;
  outcomes?: string;           // JSON string: "[\"Yes\", \"No\"]"
  outcomePrices?: string;      // JSON string: "[\"0.5\", \"0.5\"]"
  volume?: string;             // String in API
  active?: boolean;
  marketType?: string;
  formatType?: string;
  lowerBoundDate?: string;
  upperBoundDate?: string;
  closed?: boolean;
  marketMakerAddress?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  closedTime?: string;
  wideFormat?: boolean;
  new?: boolean;
  mailchimpTag?: string;
  featured?: boolean;
  archived?: boolean;
  resolvedBy?: string;
  restricted?: boolean;
  marketGroup?: number;
  groupItemTitle?: string;
  groupItemThreshold?: string;
  questionID?: string;
  umaEndDate?: string;
  enableOrderBook?: boolean;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  umaResolutionStatus?: string;
  curationOrder?: number;
  volumeNum?: number;
  liquidityNum?: number;
  endDateIso?: string;
  startDateIso?: string;
  umaEndDateIso?: string;
  hasReviewedDates?: boolean;
  readyForCron?: boolean;
  commentsEnabled?: boolean;
  volume24hr?: number;
  volume1wk?: number;
  volume1mo?: number;
  volume1yr?: number;
  gameStartTime?: string;
  secondsDelay?: number;
  clobTokenIds?: string;       // JSON string: "[\"tokenId1\", \"tokenId2\"]"
  disqusThread?: string;
  shortOutcomes?: string;
  teamAID?: string;
  teamBID?: string;
  umaBond?: string;
  umaReward?: string;
  fpmmLive?: boolean;
  volume24hrAmm?: number;
  volume1wkAmm?: number;
  volume1moAmm?: number;
  volume1yrAmm?: number;
  volume24hrClob?: number;
  volume1wkClob?: number;
  volume1moClob?: number;
  volume1yrClob?: number;
  volumeAmm?: number;
  volumeClob?: number;
  liquidityAmm?: number;
  liquidityClob?: number;
  makerBaseFee?: number;
  takerBaseFee?: number;
  customLiveness?: number;
  acceptingOrders?: boolean;
  notificationsEnabled?: boolean;
  score?: number;
  imageOptimized?: ImageOptimized;
  iconOptimized?: ImageOptimized;
  events?: GammaEvent[];
  categories?: GammaCategory[];
  tags?: GammaTag[];
  creator?: string;
  ready?: boolean;
  funded?: boolean;
  pastSlugs?: string;
  readyTimestamp?: string;
  fundedTimestamp?: string;
  acceptingOrdersTimestamp?: string;
  competitive?: number;
  rewardsMinSize?: number;
  rewardsMaxSpread?: number;
  spread?: number;
  automaticallyResolved?: boolean;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  oneMonthPriceChange?: number;
  oneYearPriceChange?: number;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  automaticallyActive?: boolean;
  clearBookOnStart?: boolean;
  chartColor?: string;
  seriesColor?: string;
  showGmpSeries?: boolean;
  showGmpOutcome?: boolean;
  manualActivation?: boolean;
  negRiskOther?: boolean;
  gameId?: string;
  groupItemRange?: string;
  sportsMarketType?: string;
  line?: number;
  umaResolutionStatuses?: string;
  pendingDeployment?: boolean;
  deploying?: boolean;
  deployingTimestamp?: string;
  scheduledDeploymentTimestamp?: string;
  rfqEnabled?: boolean;
  eventStartTime?: string;
}

// ============================================
// Helper functions for parsing JSON string fields
// ============================================

/**
 * Parse JSON string field to array (for outcomes, outcomePrices, clobTokenIds)
 */
export function parseJsonStringArray(value: string | string[] | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get clobTokenIds as array from market
 */
export function getClobTokenIds(market: GammaMarket): string[] {
  return parseJsonStringArray(market.clobTokenIds);
}

/**
 * Get outcomes as array from market
 */
export function getOutcomes(market: GammaMarket): string[] {
  return parseJsonStringArray(market.outcomes);
}

/**
 * Get outcomePrices as array from market
 */
export function getOutcomePrices(market: GammaMarket): string[] {
  return parseJsonStringArray(market.outcomePrices);
}
