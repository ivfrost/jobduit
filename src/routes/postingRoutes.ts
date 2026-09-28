import { Router } from 'express';
import { getPostings } from '../controllers/postingController.js';

const router = Router();

router.get('/', getPostings);

export default router;
