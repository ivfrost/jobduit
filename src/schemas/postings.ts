import { z } from 'zod';
import { paginationSchema } from './pagination.js';

export const getPostingsOptionsSchema = paginationSchema.extend({
	status: z.enum(['OPEN', 'CLOSED']).optional(),
	companyId: z.uuid().optional(),
});

export type GetPostingsOptions = z.infer<typeof getPostingsOptionsSchema>;
