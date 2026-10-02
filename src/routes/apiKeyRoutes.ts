import { Router } from 'express';
import {
	createApiKey,
	listApiKeys,
	revokeApiKey,
	validateApiKey,
} from '../controllers/apiKeyController.js';
import { requireSession } from '../middlewares/requireSession.js';

const router = Router();

router.post('/validate', validateApiKey);
router.use(requireSession);
router.post('/', createApiKey);
router.get('/', listApiKeys);
router.delete('/:id', revokeApiKey);

export default router;
