import type { Request, Response } from 'express';
import { generateApiKey, generateApiKeyHash } from '../lib/apiKey.js';
import { prisma } from '../lib/prisma.js';
import { ApiKeyCreateSchema, ApiKeyRevokeSchema } from '../schemas/apiKey.js';

export const createApiKey = async (req: Request, res: Response) => {
	const { name } = ApiKeyCreateSchema.parse(req.body);
	const { raw, prefix, keyHash } = generateApiKey();

	const apiKey = await prisma.apiKey.create({
		data: { userId: req.user.id, name, prefix, keyHash },
	});

	return res.status(201).json({ raw, id: apiKey.id, prefix: apiKey.prefix });
};

export const validateApiKey = async (req: Request, res: Response) => {
	const headerKey = req.headers['x-api-key'];
	const bearer = req.headers.authorization?.startsWith('Bearer ')
		? req.headers.authorization.slice(7)
		: undefined;
	const raw = typeof headerKey === 'string' ? headerKey : bearer;

	if (!raw) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const apiKey = await prisma.apiKey.findFirst({
		where: { keyHash: generateApiKeyHash(raw), revokedAt: null },
	});

	if (!apiKey) {
		return res.status(401).json({ error: 'Invalid API key' });
	}

	await prisma.apiKey.update({
		where: { id: apiKey.id },
		data: { lastUsedAt: new Date() },
	});

	return res.status(200).json({ message: 'API key is valid' });
};

export const listApiKeys = async (req: Request, res: Response) => {
	const apiKeys = await prisma.apiKey.findMany({
		where: { userId: req.user.id },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			prefix: true,
			createdAt: true,
			lastUsedAt: true,
			revokedAt: true,
		},
	});
	return res.json(apiKeys);
};

export const revokeApiKey = async (req: Request, res: Response) => {
	const { id } = ApiKeyRevokeSchema.parse(req.params);

	const apiKey = await prisma.apiKey.findFirst({
		where: { id, userId: req.user.id },
	});

	if (!apiKey) {
		return res.status(404).json({ error: 'API key not found' });
	}
	if (apiKey.revokedAt) {
		return res.status(400).json({ error: 'API key already revoked' });
	}

	await prisma.apiKey.update({
		where: { id },
		data: { revokedAt: new Date() },
	});

	return res.status(204).end();
};
