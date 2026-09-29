import { Router } from 'express';
import {
	createOrUpdatePosting,
	deletePosting,
	findPosting,
	findPostings,
	updatePosting,
} from '../controllers/postingController.js';

const router = Router();

router.post('/', createOrUpdatePosting);
router.get('/', findPostings);
router.get('/:id', findPosting);
router.put('/:id', updatePosting);
router.delete('/:id', deletePosting);

export default router;
