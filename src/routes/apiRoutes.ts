import { Router } from 'express';
import postingRoutes from './postingRoutes.js';

const router = Router();
router.use('/postings', postingRoutes);

export default router;
