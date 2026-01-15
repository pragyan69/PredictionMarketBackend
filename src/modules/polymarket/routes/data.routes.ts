import { Router } from 'express';
import { getLeaderboard, getCurrentPositions } from '../controllers/data.controller';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/positions/:address', getCurrentPositions);

export default router;
