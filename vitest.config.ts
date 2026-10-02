import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		globalSetup: './tests/globalSetup.ts',
		fileParallelism: false,
		env: {
			NODE_ENV: 'test',
			SESSION_SECRET: 'test_session_secret_0000000000000000000000000000',
			CHROME_EXTENSION_ID: '',
			// Blanked so the suite never reaches a real LLM API. dotenv does not
			// overwrite variables that are already set, so these win over .env.
			LLM_PROVIDER: '',
			LLM_API_KEY: '',
			LLM_MODEL_NAME: '',
		},
		exclude: ['node_modules', 'dist', '.kilo'],
	},
});
