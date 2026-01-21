import { Router } from 'express';
import { startHistoricalPipeline } from './polymarket.controller';
import dataRoutes from './routes/data.routes';
import clobWsRoutes from './routes/clob-ws.routes';
import rtdsWsRoutes from './routes/rtds-ws.routes';
import aggregationRoutes from './routes/aggregation.routes';
import databaseRoutes from './routes/database.routes';

export const polymarketRouter = Router();

polymarketRouter.post('/pipeline/start', startHistoricalPipeline);

// Database routes (serves data from ClickHouse) - PRIMARY FOR FRONTEND
polymarketRouter.use('/', databaseRoutes);

// Live API data routes
polymarketRouter.use('/mainData', dataRoutes);
polymarketRouter.use('/clob-ws', clobWsRoutes);
polymarketRouter.use('/rtds-ws', rtdsWsRoutes);
polymarketRouter.use('/aggregation', aggregationRoutes);


