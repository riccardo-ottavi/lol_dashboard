import { Router } from 'express';
import { discordRedirect, discordCallback, getMe } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
 
const router = Router();
 
router.get('/discord', discordRedirect);
 
router.get('/discord/callback', discordCallback);
 
router.get('/me', authMiddleware, getMe);
 
export default router;