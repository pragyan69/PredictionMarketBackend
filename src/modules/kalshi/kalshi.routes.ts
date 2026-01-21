// src/modules/kalshi/kalshi.routes.ts

import { Router } from 'express';
import aggregationRoutes from './routes/aggregation.routes';
import kalshiWsRoutes from './routes/kalshi-ws.routes';
import databaseRoutes from './routes/database.routes';

export const kalshiRouter = Router();

// Database routes (serves data from ClickHouse) - PRIMARY FOR FRONTEND
kalshiRouter.use('/', databaseRoutes);

// Aggregation pipeline routes
kalshiRouter.use('/aggregation', aggregationRoutes);

// WebSocket routes
kalshiRouter.use('/ws', kalshiWsRoutes);
