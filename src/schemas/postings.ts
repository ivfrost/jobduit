import * as z from 'zod';
import { PAGINATION_DEFAULT_TAKE, PAGINATION_MAX_TAKE } from '../constants.js';
import type { Prisma } from '../generated/prisma/client.js';
import { JobPostingWhereInputObjectZodSchema } from '../generated/zod/schemas/objects/JobPostingWhereInput.schema.js';

export const POSTING_SOURCES = [
	'LINKED_IN',
	'INDEED',
	'GREENHOUSE',
	'LEVER',
] as const;

// Accepts 'LinkedIn', 'linked-in', 'linkedin' … and normalizes to the enum.
export const postingSourceSchema = z.preprocess(
	(value) =>
		typeof value === 'string'
			? value
					.trim()
					.toUpperCase()
					.replace(/^LINKED[\s_-]*IN$/, 'LINKED_IN')
			: value,
	z.enum(POSTING_SOURCES).meta({ example: 'LINKED_IN' }),
);

// Fields likely to be captured from a job posting by the extension
export const postingCapturedSchema = z.strictObject({
	title: z.string().min(1).meta({ example: 'Senior Backend Engineer' }),
	bodyMarkdown: z.string().nullable().optional().meta({
		example: 'We are looking for a **Senior Backend Engineer**…',
	}),
	sourceUrl: z
		.url()
		.meta({ example: 'https://www.linkedin.com/jobs/view/4012345678' }),
	source: postingSourceSchema.nullable().optional(),
	postedAtRaw: z.string().nullable().optional().meta({ example: '1 day ago' }),
	applicantCountRaw: z
		.string()
		.nullable()
		.optional()
		.meta({ example: '42 applicants' }),
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
	postedAt: z.coerce
		.date()
		.nullable()
		.optional()
		.meta({ example: '2026-09-20T10:00:00.000Z' }),
	applicantCount: z
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional()
		.meta({ example: 42 }),
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
// This is the schema that is stored in the database.
export const postingEnrichedSchema = postingDerivedSchema.extend({
	summary: z
		.string()
		.nullable()
		.meta({ example: 'Senior backend role, fully remote.' }),
	category: z.nullable(jobCategorySchema),
	tags: z.array(z.string().meta({ example: 'javascript' })).default([]),
	analyzedAt: z.coerce.date().nullable(),
});

export const postingUpdateCapturedSchema = postingCapturedSchema.partial();

const scopedFindPostingsWhereSchema = JobPostingWhereInputObjectZodSchema.pick({
	OR: true,
	AND: true,
	NOT: true,
	companyId: true,
	workMode: true,
	city: true,
	country: true,
	salaryCurrency: true,
	salaryMin: true,
	salaryMax: true,
	minYearsExperience: true,
	source: true,
	status: true,
	capturedAt: true,
	updatedAt: true,
	analyzedAt: true,
});

export const findPostingsOptionsSchema = z.object({
	orderBy: z
		.array(
			z.union([
				z.literal('postedAt'),
				z.literal('capturedAt'),
				z.literal('updatedAt'),
			]),
		)
		.default(['postedAt']),
	where: scopedFindPostingsWhereSchema.optional(),
	orderDirection: z.enum(['asc', 'desc']).default('desc'),
	// Query params arrive as strings, so both need coercion.
	take: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION_MAX_TAKE)
		.optional()
		.default(PAGINATION_DEFAULT_TAKE),
	skip: z.coerce.number().int().min(0).optional().default(0),
});

export const findPostingParamsSchema = z.object({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
});

// Read shapes. These describe rows returned with `company` and `tags` included,
// so they are deliberately not derived from `postingEnrichedSchema`, which models
// the stored row (a `companyId` scalar and tag names) rather than the wire shape.
export const postingCompanySchema = z.object({
	id: z.uuid().meta({ example: '123e4567-e89b-12d3-a456-426614174000' }),
	name: z.string().meta({ example: 'Acme Inc' }),
});

export const postingTagSchema = z.object({
	id: z.uuid().meta({ example: '123e4567-e89b-12d3-a456-426614174001' }),
	name: z.string().meta({ example: 'typescript' }),
});

// Mirrors `postingSelect`.
export const postingResponseSchema = z
	.object({
		id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
		title: z.string().meta({ example: 'Senior Backend Engineer' }),
		source: z.enum(POSTING_SOURCES).nullable().meta({ example: 'LINKED_IN' }),
		// NOT NULL in the DB (defaults to OPEN), unlike the other parsed fields.
		status: z.enum(['OPEN', 'CLOSED']).meta({ example: 'OPEN' }),
		workMode: z
			.enum(['REMOTE', 'ONSITE', 'HYBRID'])
			.nullable()
			.meta({ example: 'REMOTE' }),
		city: z.string().nullable().meta({ example: 'Barcelona' }),
		country: z.string().length(2).nullable().meta({ example: 'ES' }),
		postedAt: z.coerce
			.date()
			.nullable()
			.meta({ example: '2026-09-20T10:00:00.000Z' }),
		capturedAt: z.coerce.date().meta({ example: '2026-09-20T10:00:00.000Z' }),
		minYearsExperience: z
			.number()
			.int()
			.nonnegative()
			.nullable()
			.meta({ example: 5 }),
		applicantCount: z.number().int().nullable().meta({ example: 42 }),
		salaryMin: z
			.number()
			.int()
			.nonnegative()
			.nullable()
			.meta({ example: 100000 }),
		salaryMax: z
			.number()
			.int()
			.nonnegative()
			.nullable()
			.meta({ example: 150000 }),
		salaryCurrency: z.string().length(3).nullable().meta({ example: 'EUR' }),
		salaryPeriod: z
			.enum(['YEAR', 'MONTH', 'HOUR', 'DAY'])
			.nullable()
			.meta({ example: 'YEAR' }),
		company: postingCompanySchema,
		tags: z.array(postingTagSchema),
	})
	.meta({ id: 'JobPostingSummary' });

// Mirrors `postingDetailSelect`: the summary plus the detail-only columns.
export const postingDetailedResponseSchema = postingResponseSchema
	.extend({
		// Returned by postingDetailSelect, so it belongs in the contract.
		sourceUrl: z
			.url()
			.meta({ example: 'https://www.linkedin.com/jobs/view/4012345678' }),
		bodyMarkdown: z.string().nullable().meta({
			example: 'We are looking for a **Senior Backend Engineer**…',
		}),
		canonicalUrl: z
			.string()
			.meta({ example: 'https://www.linkedin.com/jobs/view/4012345678' }),
		contentHash: z.string(),
		sourceId: z.string().nullable(),
		lastCheckedAt: z.coerce
			.date()
			.nullable()
			.meta({ example: '2026-09-20T10:00:00.000Z' }),
		updatedAt: z.coerce.date().meta({ example: '2026-09-20T10:00:00.000Z' }),
		summary: z
			.string()
			.nullable()
			.meta({ example: 'Senior backend role, fully remote.' }),
		category: z.nullable(jobCategorySchema),
		analyzedAt: z.coerce
			.date()
			.nullable()
			.meta({ example: '2026-09-20T10:00:00.000Z' }),
	})
	.meta({ id: 'JobPosting' });

export type CreatePostingCapturedInput = z.infer<typeof postingCapturedSchema>;
export type CreatePostingStoredInput = z.infer<typeof postingEnrichedSchema>;
export type FindPostingParams = z.infer<typeof findPostingParamsSchema>;
export type FindPostingsOptions = z.infer<typeof findPostingsOptionsSchema>;
export type UpdatePostingCapturedInput = z.infer<
	typeof postingUpdateCapturedSchema
>;

export const postingSelect = {
	id: true,
	title: true,
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
	company: { select: { id: true, name: true } },
	tags: { select: { id: true, name: true } },
} satisfies Prisma.JobPostingSelect;

// The summary plus the columns only the detail endpoint returns. Spreading
// `postingSelect` keeps the two from drifting apart.
export const postingDetailSelect = {
	...postingSelect,
	sourceUrl: true,
	bodyMarkdown: true,
	canonicalUrl: true,
	contentHash: true,
	sourceId: true,
	lastCheckedAt: true,
	updatedAt: true,
	summary: true,
	category: true,
	analyzedAt: true,
} satisfies Prisma.JobPostingSelect;

export type PostingDetailedSelect = typeof postingDetailSelect;
