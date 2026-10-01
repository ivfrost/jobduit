import * as z from 'zod';
import { PAGINATION_DEFAULT_TAKE, PAGINATION_MAX_TAKE } from '../constants.js';
import type { Prisma } from '../generated/prisma/client.js';
import { JobPostingFindManyZodSchema } from '../generated/zod/schemas/findManyJobPosting.schema.js';
import { JobPostingWhereInputObjectZodSchema } from '../generated/zod/schemas/objects/JobPostingWhereInput.schema.js';
import { JobPostingModelSchema } from '../generated/zod/schemas/variants/pure/JobPosting.pure.js';
import { JobTagModelSchema } from '../generated/zod/schemas/variants/pure/JobTag.pure.js';
import { companyResponseSchema } from './company.js';

export const POSTING_SOURCES = [
	'LINKED_IN',
	'INDEED',
	'GREENHOUSE',
	'LEVER',
] as const;

const postingSourceAliases: Record<string, (typeof POSTING_SOURCES)[number]> = {
	linkedin: 'LINKED_IN',
	'linked-in': 'LINKED_IN',
	linked_in: 'LINKED_IN',
	indeed: 'INDEED',
	greenhouse: 'GREENHOUSE',
	lever: 'LEVER',
};

export const postingSourceSchema = z.preprocess(
	(value) =>
		typeof value === 'string'
			? (postingSourceAliases[value.trim().toLowerCase()] ?? value)
			: value,
	z.enum(POSTING_SOURCES),
);

// Fields likely to be captured from a job posting by the extension
export const postingCapturedSchema = z.strictObject({
	title: z.string().min(1).meta({ example: 'Senior Backend Engineer' }),
	body: z.string().nullable().optional().meta({
		example: 'We are looking for a Senior Backend Engineer…',
	}),
	sourceUrl: z
		.url()
		.meta({ example: 'https://www.linkedin.com/jobs/view/4012345678' }),
	source: postingSourceSchema
		.nullable()
		.optional()
		.meta({ example: 'LINKED_IN' }),
	postedAt: z.coerce
		.date()
		.nullable()
		.optional()
		.meta({ example: '2026-09-20T10:00:00.000Z' }),
	applicantCount: z.number().int().nullable().optional().meta({ example: 42 }),
	companyNameRaw: z.string().min(1).meta({ example: 'Acme Inc' }),
	capturedAt: z.coerce.date().meta({ example: '2026-09-20T10:00:00.000Z' }),

	// Raw observations. Each has a normalizer downstream.
	statusRaw: z.string().nullable().optional().meta({ example: 'Open' }),
	workModeRaw: z.string().nullable().optional().meta({ example: 'Remote' }),
	locationRaw: z
		.string()
		.nullable()
		.optional()
		.meta({ example: 'Barcelona, Spain' }),
	experienceRaw: z.string().nullable().optional().meta({ example: '5+ years' }),
	salaryRaw: z
		.string()
		.nullable()
		.optional()
		.meta({ example: '100k-150k USD' }),
});

// Fields that are extracted from the raw fields via regex
export const postingExtractedSchema = postingCapturedSchema
	.pick({
		statusRaw: true,
		workModeRaw: true,
		locationRaw: true,
		experienceRaw: true,
		salaryRaw: true,
	})
	.partial();

export const postingNormalizedSchema = z.object({
	status: z
		.enum(['OPEN', 'CLOSED'])
		.nullable()
		.optional()
		.meta({ example: 'OPEN' }),
	workMode: z
		.enum(['REMOTE', 'ONSITE', 'HYBRID'])
		.nullable()
		.optional()
		.meta({ example: 'REMOTE' }),
	country: z.string().length(2).nullable().optional().meta({ example: 'ES' }), // ISO 3166-1 alpha-2
	city: z.string().nullable().optional().meta({ example: 'Barcelona' }),
	minYearsExperience: z
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional()
		.meta({ example: 5 }),
	salaryMin: z
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional()
		.meta({ example: 100000 }),
	salaryMax: z
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional()
		.meta({ example: 150000 }),
	salaryCurrency: z
		.string()
		.length(3)
		.nullable()
		.optional()
		.meta({ example: 'EUR' }), // ISO 4217
	salaryPeriod: z
		.enum(['YEAR', 'MONTH', 'HOUR', 'DAY'])
		.nullable()
		.optional()
		.meta({ example: 'YEAR' }),
});

// Raw captured fields + normalized fields enabling future reprocessing
export const postingDerivedSchema = postingCapturedSchema
	.extend(postingNormalizedSchema.shape)
	.extend({
		canonicalUrl: z.string(),
		sourceId: z.string().nullable(),
		contentHash: z.string(),
		companyId: z
			.uuid()
			.meta({ example: '123e4567-e89b-12d3-a456-426614174000' }),
		lastCheckedAt: z.coerce.date().nullable(),
		createdAt: z.coerce.date().meta({ example: '2024-01-01T00:00:00.000Z' }),
		updatedAt: z.coerce.date().meta({ example: '2024-01-01T00:00:00.000Z' }),
	});

export const JOB_CATEGORIES = [
	{ value: 'ENGINEERING', note: 'Software, platform, infra, mobile, QA' },
	{ value: 'DATA', note: 'Data engineering, analytics, ML, data science' },
	{ value: 'PRODUCT', note: 'Product management, ownership' },
	{ value: 'DESIGN', note: 'UX, UI, product design, user research' },
	{ value: 'SECURITY', note: 'AppSec, infosec, compliance engineering' },
	{ value: 'SALES', note: 'AE, SDR, sales engineering, partnerships' },
	{ value: 'MARKETING', note: 'Growth, content, brand, demand gen' },
	{
		value: 'CUSTOMER_SUCCESS',
		note: 'CS, support, solutions, professional services',
	},
	{ value: 'OPERATIONS', note: 'BizOps, program management, supply chain' },
	{ value: 'FINANCE', note: 'FP&A, accounting, payroll' },
	{ value: 'PEOPLE', note: 'HR, recruiting, talent' },
	{ value: 'LEGAL', note: 'Legal, policy' },
	{ value: 'ADMIN', note: 'EA, office, workplace' },
] as const;

export const jobCategorySchema = z.enum(
	JOB_CATEGORIES.map((c) => c.value) as [string, ...string[]],
);

// Optional future enrichment layered on top of captured and derived data.
export const postingEnrichedSchema = postingDerivedSchema.extend({
	summary: z
		.string()
		.nullable()
		.meta({ example: 'Senior backend role, fully remote.' }),
	category: z.string().nullable().meta({ example: 'engineering' }),
	tags: z.array(z.string().meta({ example: 'javascript' })).default([]),
	analyzedAt: z.coerce.date().nullable(),
});

export const createPostingSchema = postingCapturedSchema;

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

export const updatePostingSchema = postingCapturedSchema.partial();

export const postingDetailResponseSchema = JobPostingModelSchema.pick({
	id: true,
	companyId: true,
	title: true,
	sourceUrl: true,
	canonicalUrl: true,
	contentHash: true,
	sourceId: true,
	source: true,
	status: true,
	workMode: true,
	city: true,
	country: true,
	postedAt: true,
	capturedAt: true,
	lastCheckedAt: true,
	updatedAt: true,
	summary: true,
	category: true,
	analyzedAt: true,
	minYearsExperience: true,
	applicantCount: true,
	salaryMin: true,
	salaryMax: true,
	salaryCurrency: true,
	salaryPeriod: true,
})
	.extend({
		id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
		title: z.string().meta({ example: 'Senior Backend Engineer' }),
		sourceUrl: z.url().meta({
			example: 'https://www.linkedin.com/jobs/view/4012345678',
		}),
		source: postingSourceSchema.nullable().meta({ example: 'LINKED_IN' }),
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
		companyId: z.uuid(),
		canonicalUrl: z.url(),
		contentHash: z.string(),
		sourceId: z.string().nullable(),
		lastCheckedAt: z.iso.datetime(),
		updatedAt: z.iso.datetime(),
		summary: z.string().nullable(),
		category: z.string().nullable(),
		analyzedAt: z.iso.datetime().nullable(),
		minYearsExperience: z.number().int().nullable(),
		applicantCount: z.number().int().nullable(),
		salaryMin: z.number().int().nullable(),
		salaryMax: z.number().int().nullable(),
		salaryCurrency: z.string().nullable(),
		salaryPeriod: z.string().nullable(),
		company: companyResponseSchema,
		tags: z.array(JobTagModelSchema.pick({ id: true, name: true })).meta({
			example: [
				{ id: '00000000-0000-0000-0000-000000000001', name: 'typescript' },
				{ id: '00000000-0000-0000-0000-000000000002', name: 'backend' },
			],
		}),
	})
	.meta({ id: 'JobPosting' });

export const postingResponseSchema = postingDetailResponseSchema
	.pick({
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
		company: true,
		tags: true,
	})
	.meta({ id: 'JobPostingSummary' });

export type CreatePostingStoredInput = z.infer<typeof createPostingSchema>;
export type CreatePostingCapturedInput = z.infer<typeof postingCapturedSchema>;
export type GetPostingParams = z.infer<typeof getPostingParamsSchema>;
export type GetPostingsOptions = z.infer<typeof getPostingsOptionsSchema>;
export type UpdatePostingCapturedInput = z.infer<typeof updatePostingSchema>;

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

export const postingDetailSelect = {
	companyId: true,
	id: true,
	title: true,
	sourceUrl: true,
	canonicalUrl: true,
	contentHash: true,
	sourceId: true,
	source: true,
	status: true,
	workMode: true,
	city: true,
	country: true,
	postedAt: true,
	capturedAt: true,
	lastCheckedAt: true,
	updatedAt: true,
	summary: true,
	category: true,
	analyzedAt: true,
	minYearsExperience: true,
	applicantCount: true,
	salaryMin: true,
	salaryMax: true,
	salaryCurrency: true,
	salaryPeriod: true,
	company: { select: { id: true, name: true, city: true, country: true } },
	tags: { select: { id: true, name: true } },
} satisfies Prisma.JobPostingSelect;
