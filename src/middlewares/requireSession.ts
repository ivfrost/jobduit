import type { NextFunction, Request, Response } from 'express';

export const requireSession = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	if (req.authMethod !== 'session') {
		return res.status(403).json({ error: 'Session auth required' });
	}
	return next();
};
