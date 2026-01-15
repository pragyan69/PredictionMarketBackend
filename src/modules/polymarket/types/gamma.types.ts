// src/modules/polymarket/types/gamma.types.ts

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  markets: GammaMarket[];
}

export interface GammaMarket {
  id: string;
  slug: string;
  question: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  clobTokenIds: string[];
  conditionId: string;
  questionId: string;
  enableOrderBook: boolean;
  active: boolean;
  closed: boolean;
  archived: boolean;
  marketType: string;
  volume: string;
  liquidity: string;
  createdAt: string;
  updatedAt: string;
  endDate: string;
  startDate: string;
}

export interface GammaMarketsResponse {
  data: GammaMarket[];
  count: number;
  next_cursor?: string;
}
