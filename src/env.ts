import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

expand(dotenv.config());

const schema = z.object({
	DATABASE_URL: z.url(),
	PORT: z.coerce.number().int().positive().default(3000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	console.error('Invalid environment variables:');
	console.error(z.prettifyError(parsed.error));
	process.exit(1);
}

export const env = parsed.data;
