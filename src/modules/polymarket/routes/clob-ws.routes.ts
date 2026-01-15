import { Router } from 'express';
import { startCLOBWebSocket, stopCLOBWebSocket } from '../controllers/clob-ws.controller';

const router = Router();

router.post('/start', startCLOBWebSocket);
router.post('/stop', stopCLOBWebSocket);

export default router;
