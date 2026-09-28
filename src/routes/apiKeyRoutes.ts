import { Router } from 'express';
import {
	createApiKey,
	listApiKeys,
	revokeApiKey,
} from '../controllers/apiKeyController.js';

const router = Router();

router.post('/', createApiKey);
router.get('/', listApiKeys);
router.delete('/:id', revokeApiKey);

export default router;
