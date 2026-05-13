import { Router } from 'express';
import { linkSummoner, getMySummoner, getSummonerMatches } from '../controllers/summonerController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/link', linkSummoner);

router.get('/me', getMySummoner);

router.get('/:id/matches', getSummonerMatches);

export default router;