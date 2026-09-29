import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		globalSetup: './tests/globalSetup.ts',
		fileParallelism: false,
		env: {
			NODE_ENV: 'test',
			SESSION_SECRET: 'test_session_secret_0000000000000000000000000000',
			CHROME_EXTENSION_ID: '',
		},
		exclude: ['node_modules', 'dist'],
	},
});
