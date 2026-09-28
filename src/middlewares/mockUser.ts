import type { NextFunction, Request, Response } from 'express';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';

export const mockUser = async (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	if (env.NODE_ENV === 'production') {
		return next(new Error('mockUser must not be used in production'));
	}
	const user = await prisma.user.findFirst();
	if (!user) {
		return next(new Error('No user in DB — run `npx prisma db seed`'));
	}
	req.user = user;
	next();
};
