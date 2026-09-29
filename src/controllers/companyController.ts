import type { Request, Response } from 'express';
import {
	companyBodySchema,
	getCompanyOptionsSchema,
	getCompanyParamsSchema,
} from '../schemas/company.js';
import companyService from '../services/companyService.js';

export const findOrCreateCompany = async (req: Request, res: Response) => {
	const input = companyBodySchema.parse(req.body);
	const company = await companyService.findOrCreateCompany(req.user.id, input);
	return res.status(company.isNew ? 201 : 200).json(company);
};

export const findCompanies = async (req: Request, res: Response) => {
	const opts = getCompanyOptionsSchema.parse(req.query);
	const companies = await companyService.getCompanies(req.user.id, opts);
	return res.status(200).json(companies);
};

export const findCompany = async (req: Request, res: Response) => {
	const params = getCompanyParamsSchema.parse(req.params);
	const company = await companyService.getCompany(req.user.id, params);
	if (!company) return res.status(404).json({ error: 'Not found' });
	return res.status(200).json(company);
};

export const updateCompany = async (req: Request, res: Response) => {
	const params = getCompanyParamsSchema.parse(req.params);
	const input = companyBodySchema.parse(req.body);
	const company = await companyService.updateCompany(
		req.user.id,
		params,
		input,
	);
	if (!company) return res.status(404).json({ error: 'Not found' });
	return res.status(200).json(company);
};

export const deleteCompany = async (req: Request, res: Response) => {
	const params = getCompanyParamsSchema.parse(req.params);
	const deleted = await companyService.deleteCompany(req.user.id, params);
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	return res.status(204).end();
};
