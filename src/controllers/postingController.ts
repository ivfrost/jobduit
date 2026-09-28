import type { Request, Response } from 'express';
import { getPostingsOptionsSchema } from '../schemas/postings.js';
import postingService from '../services/postingService.js';

export const getPostings = async (req: Request, res: Response) => {
	const opts = getPostingsOptionsSchema.parse(req.query);
	const postings = await postingService.getPostings({
		...opts,
		userId: req.user.id,
	});
	res.json(postings);
};
