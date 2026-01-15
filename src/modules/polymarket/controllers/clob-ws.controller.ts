import { Request, Response } from 'express';
import { clobWsService } from '../services/clob-ws.service';

export const startCLOBWebSocket = (req: Request, res: Response) => {
  clobWsService.connect();
  res.json({ success: true, message: 'CLOB WebSocket started' });
};

export const stopCLOBWebSocket = (req: Request, res: Response) => {
  clobWsService.disconnect();
  res.json({ success: true, message: 'CLOB WebSocket stopped' });
};
