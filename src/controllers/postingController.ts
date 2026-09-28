import type { Request, Response } from 'express';
import {
	createPostingSchema,
	getPostingParamsSchema,
	getPostingsOptionsSchema,
	updatePostingSchema,
} from '../schemas/postings.js';
import postingService from '../services/postingService.js';

export const createPosting = async (req: Request, res: Response) => {
	const input = createPostingSchema.parse(req.body);
	const posting = await postingService.createPosting(req.user.id, input);
	return res.status(201).json(posting);
};

export const getPostings = async (req: Request, res: Response) => {
	const opts = getPostingsOptionsSchema.parse(req.query);
	const postings = await postingService.getPostings(req.user.id, opts);
	return res.json(postings);
};

export const getPosting = async (req: Request, res: Response) => {
	const { id } = getPostingParamsSchema.parse(req.params);
	const posting = await postingService.getPosting(req.user.id, id);
	if (!posting) return res.status(404).json({ error: 'Not found' });
	return res.json(posting);
};

export const updatePosting = async (req: Request, res: Response) => {
	const { id } = getPostingParamsSchema.parse(req.params);
	const input = updatePostingSchema.parse(req.body);
	const posting = await postingService.updatePosting(req.user.id, id, input);
	if (!posting) return res.status(404).json({ error: 'Not found' });
	return res.json(posting);
};

export const deletePosting = async (req: Request, res: Response) => {
	const { id } = getPostingParamsSchema.parse(req.params);
	const deleted = await postingService.deletePosting(req.user.id, id);
	if (!deleted) return res.status(404).json({ error: 'Not found' });
	return res.status(204).end();
};
