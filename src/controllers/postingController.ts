import type { Request, Response } from 'express';
import {
	findPostingParamsSchema,
	findPostingsOptionsSchema,
	postingCapturedSchema,
	postingUpdateCapturedSchema,
} from '../schemas/postings.js';
import postingService from '../services/postingService.js';

export const createOrUpdatePosting = async (req: Request, res: Response) => {
	const input = postingCapturedSchema.parse(req.body);
	const { posting, created } = await postingService.createOrUpdatePosting(
		req.user?.id,
		input,
	);
	return res.status(created ? 201 : 200).json(posting);
};

export const findPostings = async (req: Request, res: Response) => {
	const opts = findPostingsOptionsSchema.parse(req.query);
	const postings = await postingService.findPostings(req.user.id, opts);
	return res.json(postings);
};

export const findPosting = async (req: Request, res: Response) => {
	const params = findPostingParamsSchema.parse(req.params);
	const posting = await postingService.findPosting(req.user.id, params);
	if (!posting) return res.status(404).json({ error: 'Not found' });
	return res.json(posting);
};

export const analyzePosting = async (req: Request, res: Response) => {
	const params = findPostingParamsSchema.parse(req.params);
	await postingService.analyzePosting(req.user.id, params);
	return res.status(204).end();
};

export const updatePosting = async (req: Request, res: Response) => {
	const params = findPostingParamsSchema.parse(req.params);
	const input = postingUpdateCapturedSchema.parse(req.body);
	const posting = await postingService.updatePosting(
		req.user.id,
		params,
		input,
	);
	if (!posting) return res.status(404).json({ error: 'Not found' });
	return res.json(posting);
};

export const deletePosting = async (req: Request, res: Response) => {
	const { id } = findPostingParamsSchema.parse(req.params);
	const deleted = await postingService.deletePosting(req.user.id, id);
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	return res.status(204).end();
};

export default {
	createPosting: createOrUpdatePosting,
	findPostings,
	findPosting,
	updatePosting,
	deletePosting,
};
