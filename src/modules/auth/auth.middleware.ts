// src/modules/auth/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthContext, PolymarketCredentials, KalshiCredentials } from './types/auth.types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware that requires authentication
 * Attaches auth context to request if valid
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authorization header required',
      });
      return;
    }

    const validated = await authService.validateToken(token);

    if (!validated) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
      return;
    }

    // Load platform credentials
    const [polymarket, kalshi] = await Promise.all([
      authService.getPolymarketCredentials(validated.sessionId),
      authService.getKalshiCredentials(validated.sessionId),
    ]);

    req.auth = {
      sessionId: validated.sessionId,
      walletAddress: validated.walletAddress,
      polymarket: polymarket || undefined,
      kalshi: kalshi || undefined,
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

/**
 * Middleware that optionally loads authentication
 * Does not fail if not authenticated
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const validated = await authService.validateToken(token);

      if (validated) {
        const [polymarket, kalshi] = await Promise.all([
          authService.getPolymarketCredentials(validated.sessionId),
          authService.getKalshiCredentials(validated.sessionId),
        ]);

        req.auth = {
          sessionId: validated.sessionId,
          walletAddress: validated.walletAddress,
          polymarket: polymarket || undefined,
          kalshi: kalshi || undefined,
        };
      }
    }

    next();
  } catch (error: any) {
    // Silently continue without auth
    next();
  }
}

/**
 * Middleware that requires Polymarket credentials
 */
export async function requirePolymarketAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!req.auth.polymarket) {
    res.status(403).json({
      success: false,
      error: 'Polymarket credentials not configured. Please set up your Polymarket API credentials.',
    });
    return;
  }

  next();
}

/**
 * Middleware that requires Kalshi credentials
 */
export async function requireKalshiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!req.auth.kalshi) {
    res.status(403).json({
      success: false,
      error: 'Kalshi credentials not configured. Please set up your Kalshi API credentials.',
    });
    return;
  }

  next();
}
