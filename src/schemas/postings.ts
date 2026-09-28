import * as z from 'zod';
import { JobPostingFindManyZodSchema } from '../generated/zod/schemas/findManyJobPosting.schema.js';
import { CompanySchema } from '../generated/zod/schemas/models/Company.schema.js';
import { JobPostingSchema } from '../generated/zod/schemas/models/JobPosting.schema.js';

export const createPostingSchema = JobPostingSchema.omit({
	id: true,
	userId: true,
	companyId: true,
	capturedAt: true,
	lastCheckedAt: true,
	updatedAt: true,
}).extend({
	company: CompanySchema.pick({
		name: true,
		city: true,
		country: true,
	}),
	tags: z.array(z.string()).default([]),
});

export type CreatePostingInput = z.infer<typeof createPostingSchema>;

export const getPostingsOptionsSchema = JobPostingFindManyZodSchema.pick({
	where: true,
	orderBy: true,
	take: true,
	skip: true,
}).extend({
	take: z.coerce.number().int().min(1).max(100).default(50),
	skip: z.coerce.number().int().min(0).default(0),
});

export const getPostingParamsSchema = z.object({
	id: z.uuid(),
});

export type GetPostingParams = z.infer<typeof getPostingParamsSchema>;

export type GetPostingsOptions = z.infer<typeof getPostingsOptionsSchema>;

export const updatePostingSchema = createPostingSchema.partial();

export type UpdatePostingInput = z.infer<typeof updatePostingSchema>;
