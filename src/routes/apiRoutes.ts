import { Router } from 'express';
import apiKeyRoutes from './apiKeyRoutes.js';
import companyRoutes from './companyRoutes.js';
import postingRoutes from './postingRoutes.js';

const router = Router();
router.use('/postings', postingRoutes);
router.use('/companies', companyRoutes);
router.use('/keys', apiKeyRoutes);

export default router;
