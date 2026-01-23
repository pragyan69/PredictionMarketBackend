// src/modules/dflow/clients/trade.client.ts

import axios, { AxiosInstance } from 'axios';
import {
  QuoteRequest,
  QuoteResponse,
  SwapRequest,
  SwapResponse,
  SwapInstructionsRequest,
  SwapInstructionsResponse,
  DFLOW_CONSTANTS,
} from '../types/dflow.types';

export class DFlowTradeClient {
  private client: AxiosInstance;
  public readonly baseUrl: string;

  constructor(apiKey?: string) {
    this.baseUrl = process.env.DFLOW_TRADE_API_URL || DFLOW_CONSTANTS.TRADE_API_URL;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(apiKey && { 'x-api-key': apiKey }),
      },
    });

    // Debug request/response logging
    this.client.interceptors.request.use((config) => {
      console.log('➡️  DFlow Trade REQUEST', {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (res) => {
        console.log('✅ DFlow Trade RESPONSE', {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
        });
        return res;
      },
      (err) => {
        console.error('❌ DFlow Trade ERROR', {
          message: err.message,
          code: err.code,
          url: err.config?.url,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    console.log(`✅ DFlow Trade API client ready: ${this.baseUrl}`);
  }

  /**
   * Get a swap quote for exchanging tokens
   *
   * @param params.inputMint - Token to swap from (e.g., USDC mint or yesMint/noMint)
   * @param params.outputMint - Token to swap to
   * @param params.amount - Amount in smallest units
   * @param params.slippageBps - Slippage tolerance in basis points (default: 50 = 0.5%)
   */
  async getQuote(params: QuoteRequest): Promise<QuoteResponse> {
    const response = await this.client.get('/quote', {
      params: {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 50,
        ...(params.userPublicKey && { userPublicKey: params.userPublicKey }),
      },
    });
    return response.data;
  }

  /**
   * Get a quote for buying YES tokens with USDC
   */
  async getQuoteBuyYes(
    yesMint: string,
    usdcAmount: string,
    slippageBps: number = 50,
    userPublicKey?: string
  ): Promise<QuoteResponse> {
    return this.getQuote({
      inputMint: DFLOW_CONSTANTS.USDC_MINT,
      outputMint: yesMint,
      amount: usdcAmount,
      slippageBps,
      userPublicKey,
    });
  }

  /**
   * Get a quote for buying NO tokens with USDC
   */
  async getQuoteBuyNo(
    noMint: string,
    usdcAmount: string,
    slippageBps: number = 50,
    userPublicKey?: string
  ): Promise<QuoteResponse> {
    return this.getQuote({
      inputMint: DFLOW_CONSTANTS.USDC_MINT,
      outputMint: noMint,
      amount: usdcAmount,
      slippageBps,
      userPublicKey,
    });
  }

  /**
   * Get a quote for selling YES tokens to USDC
   */
  async getQuoteSellYes(
    yesMint: string,
    tokenAmount: string,
    slippageBps: number = 50,
    userPublicKey?: string
  ): Promise<QuoteResponse> {
    return this.getQuote({
      inputMint: yesMint,
      outputMint: DFLOW_CONSTANTS.USDC_MINT,
      amount: tokenAmount,
      slippageBps,
      userPublicKey,
    });
  }

  /**
   * Get a quote for selling NO tokens to USDC
   */
  async getQuoteSellNo(
    noMint: string,
    tokenAmount: string,
    slippageBps: number = 50,
    userPublicKey?: string
  ): Promise<QuoteResponse> {
    return this.getQuote({
      inputMint: noMint,
      outputMint: DFLOW_CONSTANTS.USDC_MINT,
      amount: tokenAmount,
      slippageBps,
      userPublicKey,
    });
  }

  /**
   * Create a swap transaction from a quote
   * Returns a base64-encoded transaction that the user needs to sign
   *
   * @param params.userPublicKey - User's Solana public key
   * @param params.quoteResponse - Quote response from getQuote()
   */
  async createSwap(params: SwapRequest): Promise<SwapResponse> {
    const response = await this.client.post('/swap', {
      userPublicKey: params.userPublicKey,
      quoteResponse: params.quoteResponse,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
      computeUnitPriceMicroLamports: params.computeUnitPriceMicroLamports,
      asLegacyTransaction: params.asLegacyTransaction ?? false,
      useSharedAccounts: params.useSharedAccounts ?? true,
      destinationTokenAccount: params.destinationTokenAccount,
    });
    return response.data;
  }

  /**
   * Get individual swap instructions instead of a full transaction
   * Useful for building custom transactions or integrating with other programs
   */
  async getSwapInstructions(params: SwapInstructionsRequest): Promise<SwapInstructionsResponse> {
    const response = await this.client.post('/swap-instructions', {
      userPublicKey: params.userPublicKey,
      quoteResponse: params.quoteResponse,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
    });
    return response.data;
  }

  /**
   * Convenience method: Get quote and create swap transaction in one call
   *
   * @param inputMint - Token to swap from
   * @param outputMint - Token to swap to
   * @param amount - Amount in smallest units
   * @param userPublicKey - User's Solana public key
   * @param slippageBps - Slippage tolerance (default: 50 = 0.5%)
   */
  async getQuoteAndSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; swap: SwapResponse }> {
    // Get quote
    const quote = await this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps,
      userPublicKey,
    });

    // Create swap transaction
    const swap = await this.createSwap({
      userPublicKey,
      quoteResponse: quote,
    });

    return { quote, swap };
  }

  /**
   * Buy YES tokens with USDC - complete flow
   */
  async buyYes(
    yesMint: string,
    usdcAmount: string,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; swap: SwapResponse }> {
    return this.getQuoteAndSwap(
      DFLOW_CONSTANTS.USDC_MINT,
      yesMint,
      usdcAmount,
      userPublicKey,
      slippageBps
    );
  }

  /**
   * Buy NO tokens with USDC - complete flow
   */
  async buyNo(
    noMint: string,
    usdcAmount: string,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; swap: SwapResponse }> {
    return this.getQuoteAndSwap(
      DFLOW_CONSTANTS.USDC_MINT,
      noMint,
      usdcAmount,
      userPublicKey,
      slippageBps
    );
  }

  /**
   * Sell YES tokens for USDC - complete flow
   */
  async sellYes(
    yesMint: string,
    tokenAmount: string,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; swap: SwapResponse }> {
    return this.getQuoteAndSwap(
      yesMint,
      DFLOW_CONSTANTS.USDC_MINT,
      tokenAmount,
      userPublicKey,
      slippageBps
    );
  }

  /**
   * Sell NO tokens for USDC - complete flow
   */
  async sellNo(
    noMint: string,
    tokenAmount: string,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<{ quote: QuoteResponse; swap: SwapResponse }> {
    return this.getQuoteAndSwap(
      noMint,
      DFLOW_CONSTANTS.USDC_MINT,
      tokenAmount,
      userPublicKey,
      slippageBps
    );
  }
}

// Export singleton instance
export const dflowTradeClient = new DFlowTradeClient(process.env.DFLOW_API_KEY);
