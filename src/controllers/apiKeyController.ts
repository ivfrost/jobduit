import type { Request, Response } from 'express';
import { generateApiKey } from '../lib/apiKey.js';
import { prisma } from '../lib/prisma.js';
import { ApiKeyCreateSchema, ApiKeyRevokeSchema } from '../schemas/apiKey.js';

export const createApiKey = async (req: Request, res: Response) => {
	const input = ApiKeyCreateSchema.parse(req.body);
	const { name } = input;

	const { raw, prefix, keyHash } = generateApiKey();

	const apiKey = await prisma.apiKey.create({
		data: { userId: req.user.id, name, prefix, keyHash },
	});

	return res
		.status(201)
		.json({ raw: raw, id: apiKey.id, prefix: apiKey.prefix });
};

export const listApiKeys = async (req: Request, res: Response) => {
	const apiKeys = await prisma.apiKey.findMany({
		where: { userId: req.user.id },
		select: {
			id: true,
			name: true,
			prefix: true,
			createdAt: true,
			lastUsedAt: true,
			revokedAt: true,
		},
	});
	res.json(apiKeys);
};

export const revokeApiKey = async (req: Request, res: Response) => {
	const { id } = ApiKeyRevokeSchema.parse(req.params);

	const apiKey = await prisma.apiKey.findUnique({
		where: { id, userId: req.user.id },
	});

	if (!apiKey) {
		return res.status(404).json({ error: 'API key not found' });
	}

	await prisma.apiKey.update({
		where: { id },
		data: { revokedAt: new Date() },
	});

	return res.status(204).end();
};
