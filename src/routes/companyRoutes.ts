import { Router } from 'express';
import {
	deleteCompany,
	findCompanies,
	findCompany,
	findOrCreateCompany,
	updateCompany,
} from '../controllers/companyController.js';

const router = Router();

router.post('/', findOrCreateCompany);
router.get('/', findCompanies);
router.get('/:id', findCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

export default router;
