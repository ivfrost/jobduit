import { z } from 'zod';

export const paginationSchema = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.meta({ example: 50 }),
	cursor: z
		.uuid()
		.optional()
		.meta({ example: '00000000-0000-0000-0000-000000000000' }),
	offset: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
});

export const paginationResponseSchema = z.object({
	limit: z.number().int().nonnegative().meta({ example: 50 }),
	offset: z.number().int().nonnegative().meta({ example: 0 }),
	total: z.number().int().nonnegative().meta({ example: 128 }),
	hasMore: z.boolean().meta({ example: true }),
});

export type Pagination = z.infer<typeof paginationSchema>;
