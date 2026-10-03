import { z } from 'zod';

export const apiFieldsSchema = z.object({
	apiKey: z
		.string()
		.min(1, { message: 'API key is required' })
		.min(9, { message: 'API key must be at least 9 characters' })
		.startsWith('jd_live_', { message: 'API key must start with "jd_live_"' }),
	apiUrl: z
		.string()
		.min(1, { message: 'Server URL is required' })
		.pipe(z.url({ message: 'Please enter a valid URL' })),
	autoAnalyze: z.boolean(),
});
