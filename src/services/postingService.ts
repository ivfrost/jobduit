import type { PostingSource } from '../generated/prisma/client.js';
import { env } from '../lib/env.js';
import {
	extractApplicantCount,
	extractFromBody,
	extractLocation,
	extractMinYears,
	extractPostedAt,
	extractSalary,
	extractStatus,
	extractWorkMode,
	type PostingStatus,
	type WorkMode,
} from '../lib/extract.js';
import { analyzePostingWithLLM } from '../lib/llm.js';
import {
	canonicalizeUrl,
	contentFingerprint,
	extractSourceId,
} from '../lib/postingIdentity.js';
import { prisma } from '../lib/prisma.js';
import type {
	CreatePostingCapturedInput,
	FindPostingParams,
	FindPostingsOptions,
	UpdatePostingCapturedInput,
} from '../schemas/postings.js';
import { postingDetailSelect, postingSelect } from '../schemas/postings.js';
import { findOrCreateCompany } from './companyService.js';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const findExistingPosting = async (
	tx: Tx,
	userId: string,
	canonicalUrl: string,
	source: PostingSource | null,
	sourceId: string | null,
	contentHash: string,
): Promise<string | null> => {
	// Tier 1: board-native ID
	if (source && sourceId) {
		const bySourceId = await tx.jobPosting.findFirst({
			where: { userId, source, sourceId },
			select: { id: true },
		});
		if (bySourceId) return bySourceId.id;
	}

	// Tier 2: canonical URL
	const byUrl = await tx.jobPosting.findFirst({
		where: { userId, canonicalUrl },
		select: { id: true },
	});
	if (byUrl) return byUrl.id;

	// Tier 3: content fingerprint
	const byHash = await tx.jobPosting.findFirst({
		where: { userId, contentHash },
		select: { id: true },
	});
	if (byHash) return byHash.id;

	return null;
};

export const createOrUpdatePosting = async (
	userId: string,
	input: CreatePostingCapturedInput,
) => {
	const {
		companyNameRaw,
		statusRaw,
		workModeRaw,
		experienceRaw,
		salaryRaw,
		locationRaw,
		postedAtRaw,
		applicantCountRaw,
		...data
	} = input;

	const location = extractLocation(locationRaw);
	const postedAt = extractPostedAt(postedAtRaw, data.capturedAt);
	const applicantCount = extractApplicantCount(applicantCountRaw);
	const canonicalUrl = canonicalizeUrl(data.sourceUrl);
	const sourceId = extractSourceId(data.sourceUrl, data.source);

	const bodyExtracted = extractFromBody(data.bodyMarkdown);
	const rawExtracted = {
		status: statusRaw ? extractStatus(statusRaw) : null,
		workMode: workModeRaw ? extractWorkMode(workModeRaw) : null,
		minYearsExperience: experienceRaw ? extractMinYears(experienceRaw) : null,
		salary: salaryRaw ? extractSalary(salaryRaw) : null,
	};
	const status: PostingStatus | undefined =
		rawExtracted.status ?? bodyExtracted.status ?? undefined;
	const workMode: WorkMode | null | undefined =
		rawExtracted.workMode ?? bodyExtracted.workMode ?? null;
	const derivedData = {
		...data,
		status,
		workMode,
		city: location.city,
		country: location.country,
		postedAt,
		minYearsExperience:
			rawExtracted.minYearsExperience ??
			bodyExtracted.minYearsExperience ??
			null,
		applicantCount: applicantCount ?? bodyExtracted.applicantCount ?? null,
		salaryMin: rawExtracted.salary?.min ?? bodyExtracted.salary?.min ?? null,
		salaryMax: rawExtracted.salary?.max ?? bodyExtracted.salary?.max ?? null,
		salaryCurrency:
			rawExtracted.salary?.currency ?? bodyExtracted.salary?.currency ?? null,
		salaryPeriod: bodyExtracted.salary?.period ?? null,
		salaryRaw:
			salaryRaw ??
			rawExtracted.salary?.raw ??
			bodyExtracted.salary?.raw ??
			null,
	};

	return prisma.$transaction(async (tx) => {
		const companyName = companyNameRaw;
		if (!companyName) {
			throw new Error('Posting company name is required');
		}

		const { id: companyId } = await findOrCreateCompany(
			userId,
			{
				name: companyName,
				city: '',
				country: '',
			},
			tx,
		);

		const contentHash = contentFingerprint(
			userId,
			companyId,
			derivedData.title,
			null,
		);

		const existingId = await findExistingPosting(
			tx,
			userId,
			canonicalUrl,
			derivedData.source ?? null,
			sourceId,
			contentHash,
		);

		const identity = { canonicalUrl, contentHash, sourceId };

		// Enrichment owns summary, category, tags and analyzedAt. They are
		// deliberately absent from both writes: a re-capture refreshes what the
		// extension scraped, never what the LLM produced.
		if (existingId) {
			const posting = await tx.jobPosting.update({
				where: { id: existingId },
				data: {
					...derivedData,
					...identity,
					companyId,
					lastCheckedAt: new Date(),
				},
				select: postingDetailSelect,
			});
			return { posting, created: false };
		}

		const posting = await tx.jobPosting.create({
			data: {
				...derivedData,
				...identity,
				userId,
				companyId,
			},
			select: postingDetailSelect,
		});
		return { posting, created: true };
	});
};

export const findPostings = async (
	userId: string,
	opts: FindPostingsOptions,
) => {
	const where = { ...opts.where, userId };

	const [data, total] = await Promise.all([
		prisma.jobPosting.findMany({
			where,
			orderBy: opts.orderBy.map((field) => ({ [field]: opts.orderDirection })),
			take: opts.take,
			skip: opts.skip,
			select: postingSelect,
		}),
		prisma.jobPosting.count({ where }),
	]);

	return {
		data,
		pagination: {
			limit: opts.take,
			offset: opts.skip,
			total,
			hasMore: opts.skip + data.length < total,
		},
	};
};

export const findPosting = async (
	userId: string,
	params: FindPostingParams,
) => {
	const { id } = params;
	return prisma.jobPosting.findFirst({
		where: { id, userId },
		select: postingDetailSelect,
	});
};

export const analyzePosting = async (
	userId: string,
	params: FindPostingParams,
) => {
	if (!env.LLM_PROVIDER || !env.LLM_API_KEY) return;
	const { id } = params;
	const posting = await prisma.jobPosting.findFirst({
		where: { id, userId },
		select: postingDetailSelect,
	});
	if (!posting?.bodyMarkdown) return;

	const { summary, category, tags } = await analyzePostingWithLLM(posting);

	await prisma.jobPosting.update({
		where: { id },
		data: {
			summary,
			category,
			// Re-analysis replaces the tag set. `set: []` throws P2025 when
			// combined with connectOrCreate, so disconnect what is there.
			tags: {
				disconnect: posting.tags.map(({ id }) => ({ id })),
				connectOrCreate: tags.map((name) => ({
					where: { name },
					create: { name },
				})),
			},
			analyzedAt: new Date(),
		},
	});
};

export const updatePosting = async (
	userId: string,
	params: FindPostingParams,
	input: UpdatePostingCapturedInput,
) => {
	const { id } = params;
	const {
		companyNameRaw,
		statusRaw,
		workModeRaw,
		experienceRaw,
		salaryRaw,
		locationRaw,
		postedAtRaw,
		applicantCountRaw,
		...data
	} = input;

	const bodyExtracted = data.bodyMarkdown
		? extractFromBody(data.bodyMarkdown)
		: {};
	const rawExtracted = {
		status: statusRaw ? extractStatus(statusRaw) : null,
		workMode: workModeRaw ? extractWorkMode(workModeRaw) : null,
		minYearsExperience: experienceRaw ? extractMinYears(experienceRaw) : null,
		salary: salaryRaw ? extractSalary(salaryRaw) : null,
	};
	const status: PostingStatus | undefined =
		rawExtracted.status ?? bodyExtracted.status ?? undefined;
	const workMode: WorkMode | undefined =
		rawExtracted.workMode ?? bodyExtracted.workMode ?? undefined;

	const derivedData = {
		...data,
		status,
		workMode,
		// Absent location leaves the stored one alone, like the other fields here.
		...(locationRaw ? extractLocation(locationRaw) : {}),
		postedAt: postedAtRaw
			? extractPostedAt(postedAtRaw, data.capturedAt)
			: undefined,
		minYearsExperience:
			rawExtracted.minYearsExperience ??
			bodyExtracted.minYearsExperience ??
			undefined,
		applicantCount:
			(applicantCountRaw ? extractApplicantCount(applicantCountRaw) : null) ??
			bodyExtracted.applicantCount,
		salaryMin:
			rawExtracted.salary?.min ?? bodyExtracted.salary?.min ?? undefined,
		salaryMax:
			rawExtracted.salary?.max ?? bodyExtracted.salary?.max ?? undefined,
		salaryCurrency:
			rawExtracted.salary?.currency ??
			bodyExtracted.salary?.currency ??
			undefined,
		salaryPeriod:
			data.bodyMarkdown !== undefined
				? (bodyExtracted.salary?.period ?? null)
				: undefined,
		salaryRaw:
			salaryRaw ??
			rawExtracted.salary?.raw ??
			bodyExtracted.salary?.raw ??
			undefined,
	};

	const existing = await prisma.jobPosting.findFirst({
		where: { id, userId },
		select: { id: true },
	});
	if (!existing) return null;

	let companyId: string | undefined;
	if (companyNameRaw) {
		const companyName = companyNameRaw;
		if (!companyName) {
			throw new Error('Posting company name is required');
		}

		const companyResult = await findOrCreateCompany(userId, {
			name: companyName,
			city: '',
			country: '',
		});
		companyId = companyResult.id;
	}

	await prisma.jobPosting.update({
		where: { id: existing.id },
		data: {
			...derivedData,
			...(companyId && { companyId }),
		},
	});

	return prisma.jobPosting.findFirst({
		where: { id, userId },
		select: postingDetailSelect,
	});
};

export const deletePosting = async (userId: string, id: string) => {
	return prisma.$transaction(async (tx) => {
		const posting = await tx.jobPosting.findFirst({
			where: { id, userId },
			select: { id: true },
		});
		if (!posting) return false;

		await tx.application.deleteMany({
			where: { postingId: posting.id },
		});

		const { count } = await tx.jobPosting.deleteMany({
			where: { id: posting.id },
		});
		return count > 0;
	});
};

export default {
	createOrUpdatePosting,
	findPostings,
	findPosting,
	analyzePosting,
	updatePosting,
	deletePosting,
};
