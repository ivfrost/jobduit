import * as z from 'zod';
import { PAGINATION_DEFAULT_TAKE, PAGINATION_MAX_TAKE } from '../constants.js';
import type { Prisma } from '../generated/prisma/client.js';
import { JobPostingFindManyZodSchema } from '../generated/zod/schemas/findManyJobPosting.schema.js';
import { JobPostingCreateInputObjectZodSchema } from '../generated/zod/schemas/objects/JobPostingCreateInput.schema.js';
import { JobPostingWhereInputObjectZodSchema } from '../generated/zod/schemas/objects/JobPostingWhereInput.schema.js';
import { JobPostingModelSchema } from '../generated/zod/schemas/variants/pure/JobPosting.pure.js';
import { JobTagModelSchema } from '../generated/zod/schemas/variants/pure/JobTag.pure.js';
import { companyBodySchema, companyResponseSchema } from './company.js';

const postingBodySchema = JobPostingCreateInputObjectZodSchema.omit({
	id: true,
	user: true,
	company: true,
	tags: true,
	applications: true,
	capturedAt: true,
	lastCheckedAt: true,
	canonicalUrl: true,
	contentHash: true,
	sourceId: true,
	salaryMin: true,
	salaryMax: true,
	salaryCurrency: true,
	salaryPeriod: true,
	salaryRaw: true,
});

const tagNameSchema = JobTagModelSchema.shape.name;

export const createPostingSchema = postingBodySchema.extend({
	sourceUrl: z
		.url()
		.meta({ example: 'https://www.linkedin.com/jobs/view/4012345678' }),
	title: z.string().min(1).meta({ example: 'Senior Backend Engineer' }),
	body: z.string().nullable().optional().meta({
		example:
			'We are looking for a Senior Backend Engineer to join our platform team. Remote-friendly, EU timezone.',
	}),
	postedAt: z.coerce
		.date()
		.nullable()
		.optional()
		.meta({ example: '2026-09-20T10:00:00.000Z' }),
	status: z.enum(['OPEN', 'CLOSED']).optional().meta({ example: 'OPEN' }),
	applicantCount: z.number().int().nullable().optional().meta({ example: 42 }),
	source: z.string().nullable().optional().meta({ example: 'LinkedIn' }),
	workMode: z
		.enum(['REMOTE', 'HYBRID', 'ONSITE'])
		.nullable()
		.optional()
		.meta({ example: 'REMOTE' }),
	city: z.string().nullable().optional().meta({ example: 'Madrid' }),
	country: z.string().nullable().optional().meta({ example: 'ES' }),
	summary: z
		.string()
		.nullable()
		.optional()
		.meta({ example: 'Senior backend role, fully remote, backend focus.' }),
	category: z.string().nullable().optional().meta({ example: 'engineering' }),
	minYearsExperience: z
		.number()
		.int()
		.nullable()
		.optional()
		.meta({ example: 5 }),
	analyzedAt: z.coerce
		.date()
		.nullable()
		.optional()
		.meta({ example: '2026-09-21T12:00:00.000Z' }),
	company: companyBodySchema,
	tags: z
		.array(tagNameSchema)
		.optional()
		.meta({ example: ['typescript', 'backend', 'remote'] }),
});

const scopedGetPostingsWhereSchema = JobPostingWhereInputObjectZodSchema.omit({
	userId: true,
});

export const getPostingsOptionsSchema = JobPostingFindManyZodSchema.pick({
	orderBy: true,
	take: true,
	skip: true,
}).extend({
	where: scopedGetPostingsWhereSchema.optional(),
	take: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION_MAX_TAKE)
		.default(PAGINATION_DEFAULT_TAKE)
		.meta({ example: 50 }),
	skip: z.coerce.number().int().min(0).default(0).meta({ example: 0 }),
});

export const getPostingParamsSchema = z.object({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
});

export const updatePostingSchema = createPostingSchema.partial();

export const postingResponseSchema = JobPostingModelSchema.pick({
	id: true,
	title: true,
	sourceUrl: true,
	source: true,
	status: true,
	workMode: true,
	city: true,
	country: true,
	postedAt: true,
	capturedAt: true,
})
	.extend({
		id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
		title: z.string().meta({ example: 'Senior Backend Engineer' }),
		sourceUrl: z.url().meta({
			example: 'https://www.linkedin.com/jobs/view/4012345678',
		}),
		source: z.string().nullable().meta({ example: 'LinkedIn' }),
		status: z.enum(['OPEN', 'CLOSED']).meta({ example: 'OPEN' }),
		workMode: z
			.enum(['REMOTE', 'HYBRID', 'ONSITE'])
			.nullable()
			.meta({ example: 'REMOTE' }),
		city: z.string().nullable().meta({ example: 'Madrid' }),
		country: z.string().nullable().meta({ example: 'ES' }),
		postedAt: z.iso
			.datetime()
			.nullable()
			.meta({ example: '2026-09-20T10:00:00.000Z' }),
		capturedAt: z.iso.datetime().meta({ example: '2026-09-21T12:00:00.000Z' }),
		company: companyResponseSchema,
		tags: z.array(JobTagModelSchema.pick({ id: true, name: true })).meta({
			example: [
				{ id: '00000000-0000-0000-0000-000000000001', name: 'typescript' },
				{ id: '00000000-0000-0000-0000-000000000002', name: 'backend' },
			],
		}),
	})
	.meta({ id: 'JobPosting' });

export type CreatePostingInput = z.infer<typeof createPostingSchema>;
export type GetPostingParams = z.infer<typeof getPostingParamsSchema>;
export type GetPostingsOptions = z.infer<typeof getPostingsOptionsSchema>;
export type UpdatePostingInput = z.infer<typeof updatePostingSchema>;

export const postingSelect = {
	id: true,
	title: true,
	sourceUrl: true,
	source: true,
	status: true,
	workMode: true,
	city: true,
	country: true,
	postedAt: true,
	capturedAt: true,
	minYearsExperience: true,
	applicantCount: true,
	salaryMin: true,
	salaryMax: true,
	salaryCurrency: true,
	salaryPeriod: true,
	company: { select: { id: true, name: true, city: true, country: true } },
	tags: { select: { id: true, name: true } },
} satisfies Prisma.JobPostingSelect;
