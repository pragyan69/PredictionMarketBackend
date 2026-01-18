// src/modules/kalshi/kalshi.routes.ts

import { Router } from 'express';
import aggregationRoutes from './routes/aggregation.routes';
import kalshiWsRoutes from './routes/kalshi-ws.routes';

export const kalshiRouter = Router();

// Aggregation pipeline routes
kalshiRouter.use('/aggregation', aggregationRoutes);

// WebSocket routes
kalshiRouter.use('/ws', kalshiWsRoutes);
