import { Router } from 'express';
import { getMarkets, startHistoricalPipeline } from './polymarket.controller';
import dataRoutes from './routes/data.routes';
import clobWsRoutes from './routes/clob-ws.routes';
import rtdsWsRoutes from './routes/rtds-ws.routes';

export const polymarketRouter = Router();

polymarketRouter.get('/markets', getMarkets);
polymarketRouter.post('/pipeline/start', startHistoricalPipeline);

polymarketRouter.use('/data', dataRoutes);
polymarketRouter.use('/clob-ws', clobWsRoutes);
polymarketRouter.use('/rtds-ws', rtdsWsRoutes);


