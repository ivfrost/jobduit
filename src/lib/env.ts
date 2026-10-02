import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

expand(dotenv.config());

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const schema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),

	DATABASE_URL: z
		.url()
		.refine(
			(v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
			'Must be a postgres connection string',
		),

	PORT: z.coerce.number().int().positive().default(3000),

	REDIS_URL: z
		.url()
		.refine(
			(v) => v.startsWith('redis://') || v.startsWith('rediss://'),
			'Must be a redis connection string',
		),

	SESSION_SECRET: z.string().min(32),

	CHROME_EXTENSION_ID: z
		.string()
		.default('')
		.transform((v) => (v === '' ? undefined : v))
		.pipe(
			z
				.string()
				.regex(/^[a-p]{32}$/, 'Must be a 32-char Chrome extension ID')
				.optional(),
		),

	// An empty value means "enrichment off", which is how the test suite keeps
	// itself from calling a real API.
	LLM_PROVIDER: z.preprocess(
		emptyToUndefined,
		z.enum(['deepseek', 'gemini', 'anthropic']).optional(),
	),
	LLM_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
	// Free-form: model names churn, and each provider names them differently.
	// e.g. deepseek-chat, gemini-2.5-flash, claude-opus-5-5
	LLM_MODEL_NAME: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	console.error('Invalid environment variables:');
	console.error(z.prettifyError(parsed.error));
	process.exit(1);
}

export const env = parsed.data;
