import { z } from 'zod';
import type { ApiKey as PrismaApiKey } from '../generated/prisma/client.js';
import { ApiKeySchema } from '../generated/zod/schemas/models/ApiKey.schema.js';

export const ApiKeyStoredSchema = ApiKeySchema.extend({
	lastUsedAt: z.date().nullable(),
	revokedAt: z.date().nullable(),
	keyHash: z.string().regex(/^[a-f0-9]{64}$/, 'Expected a SHA-256 hex hash'),
	prefix: z.string().regex(/^jd_live_[a-f0-9]{4}$/, 'Expected a key prefix'),
}) satisfies z.ZodType<PrismaApiKey, any>;

export type ApiKeyStored = z.infer<typeof ApiKeyStoredSchema>;

export const ApiKeyPublicSchema = ApiKeyStoredSchema.omit({ keyHash: true });
export type ApiKeyPublic = z.infer<typeof ApiKeyPublicSchema>;

export const ApiKeyCreateSchema = z.object({
	name: z.string().min(1).max(100),
});

export const ApiKeyRevokeSchema = z.object({
	id: z.string().uuid(),
});
