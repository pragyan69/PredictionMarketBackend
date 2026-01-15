import { Request, Response } from 'express';
import { rtdsWsService } from '../services/rtds-ws.service';

export const startRTDSWebSocket = (req: Request, res: Response) => {
  rtdsWsService.connect();
  res.json({ success: true, message: 'RTDS WebSocket started' });
};

export const stopRTDSWebSocket = (req: Request, res: Response) => {
  rtdsWsService.disconnect();
  res.json({ success: true, message: 'RTDS WebSocket stopped' });
};
