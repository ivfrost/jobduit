import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const publicUser = {
	id: true,
	email: true,
	role: true,
	createdAt: true,
} as const;

const findUser = (id: string) =>
	prisma.user.findUnique({ where: { id }, select: publicUser });

export type AuthUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;

const LAST_USED_THROTTLE_MS = 60_000;

const extractApiKey = (req: Request): string | undefined => {
	const header = req.headers.authorization;
	if (!header?.startsWith('Bearer ')) {
		const xApiKeyHeader = req.headers['x-api-key'];
		if (typeof xApiKeyHeader === 'string') {
			return xApiKeyHeader;
		}
		return undefined;
	}
	const token = header.slice(7).trim();
	return token || undefined;
};

export const requireAuth = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// API key (extension)
	const apiKey = extractApiKey(req);
	if (apiKey) {
		const keyHash = createHash('sha256').update(apiKey).digest('hex');
		const record = await prisma.apiKey.findUnique({
			where: { keyHash },
			select: {
				id: true,
				revokedAt: true,
				lastUsedAt: true,
				user: { select: publicUser },
			},
		});

		if (!record || record.revokedAt !== null) {
			return res.status(401).json({ error: 'Invalid API key' });
		}

		const stale =
			!record.lastUsedAt ||
			Date.now() - record.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS;
		if (stale) {
			prisma.apiKey
				.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
				.catch((err) => console.error('Failed to update lastUsedAt', err));
		}

		req.user = record.user;
		req.authMethod = 'apiKey';
		return next();
	}

	// Session cookie (UI)
	const userId = req.session?.userId;
	if (userId) {
		const user = await findUser(userId);
		if (user) {
			req.user = user;
			req.authMethod = 'session';
			return next();
		}
		req.session.destroy(() => {});
	}

	res.status(401).json({ error: 'Unauthorized' });
};
