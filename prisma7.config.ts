import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig } from 'prisma/config';

expand(dotenv.config());

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx prisma/seed.ts',
	},
	datasource: { url },
});
