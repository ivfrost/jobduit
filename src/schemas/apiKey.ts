import { z } from 'zod';
import { ApiKeySchema } from '../generated/zod/schemas/models/ApiKey.schema.js';

export const ApiKeyStoredSchema = ApiKeySchema.extend({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
	userId: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000001' }),
	name: z.string().meta({ example: 'Chrome extension' }),
	lastUsedAt: z.coerce
		.date()
		.nullable()
		.meta({ example: '2026-09-28T12:00:00.000Z' }),
	revokedAt: z.coerce.date().nullable().meta({ example: null }),
	keyHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/, 'Expected a SHA-256 hex hash')
		.meta({
			example:
				'0000000000000000000000000000000000000000000000000000000000000000',
		}),
	prefix: z
		.string()
		.regex(/^jd_live_[a-f0-9]{4}$/, 'Expected a key prefix')
		.meta({ example: 'jd_live_a1b2' }),
	createdAt: z.coerce.date().meta({ example: '2026-09-28T12:00:00.000Z' }),
});

export type ApiKeyStored = z.infer<typeof ApiKeyStoredSchema>;

export const ApiKeyPublicSchema = ApiKeyStoredSchema.omit({ keyHash: true });

export const apiKeyResponseSchema = ApiKeyPublicSchema.omit({
	userId: true,
});

export const apiKeyCreateResponseSchema = z.object({
	raw: z.string().meta({
		example:
			'jd_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
	}),
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
	prefix: z.string().meta({ example: 'jd_live_a1b2' }),
});

export type ApiKeyPublic = z.infer<typeof ApiKeyPublicSchema>;

export const ApiKeyCreateSchema = z.object({
	name: z.string().min(1).max(100).meta({ example: 'Chrome extension' }),
});

export const ApiKeyRevokeSchema = z.object({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
});

export type ApiKeyCreateInput = z.infer<typeof ApiKeyCreateSchema>;
export type ApiKeyRevokeInput = z.infer<typeof ApiKeyRevokeSchema>;
