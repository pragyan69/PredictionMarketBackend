import { Router } from 'express';
import { startRTDSWebSocket, stopRTDSWebSocket } from '../controllers/rtds-ws.controller';

const router = Router();

router.post('/start', startRTDSWebSocket);
router.post('/stop', stopRTDSWebSocket);

export default router;
