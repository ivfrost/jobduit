import { Router } from 'express';
import {
	createPosting,
	deletePosting,
	getPosting,
	getPostings,
	updatePosting,
} from '../controllers/postingController.js';

const router = Router();

router.post('/', createPosting);
router.get('/', getPostings);
router.get('/:id', getPosting);
router.put('/:id', updatePosting);
router.delete('/:id', deletePosting);

export default router;
