import { Router } from 'express';
import { env } from '../lib/env.js';
import { mockUser } from '../middlewares/mockUser.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import postingRoutes from './postingRoutes.js';
const auth = env.NODE_ENV === 'production' ? requireAuth : mockUser;

const router = Router();
router.use(auth);
router.use('/postings', postingRoutes);

export default router;
