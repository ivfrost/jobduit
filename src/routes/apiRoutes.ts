import { Router } from 'express';
import apiKeyRoutes from './apiKeyRoutes.js';
import postingRoutes from './postingRoutes.js';

const router = Router();
router.use('/postings', postingRoutes);
router.use('/keys', apiKeyRoutes);

export default router;
