import type { PostingSource } from '../generated/prisma/client.js';
import {
	extractFromBody,
	extractMinYears,
	extractSalary,
	extractStatus,
	extractWorkMode,
	type PostingStatus,
	type WorkMode,
} from '../lib/extract.js';
import {
	canonicalizeUrl,
	contentFingerprint,
	extractSourceId,
} from '../lib/postingIdentity.js';
import { prisma } from '../lib/prisma.js';
import type {
	CreatePostingCapturedInput,
	GetPostingParams as FindPostingParams,
	GetPostingsOptions as FindPostingsOptions,
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
		locationRaw: _locationRaw,
		...data
	} = input;

	const canonicalUrl = canonicalizeUrl(data.sourceUrl);
	const sourceId = extractSourceId(data.sourceUrl, data.source);

	const bodyExtracted = extractFromBody(data.body);
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
		minYearsExperience:
			rawExtracted.minYearsExperience ??
			bodyExtracted.minYearsExperience ??
			null,
		applicantCount: data.applicantCount ?? bodyExtracted.applicantCount ?? null,
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

		const tagOps = {
			connectOrCreate: [],
		};

		if (existingId) {
			const posting = await tx.jobPosting.update({
				where: { id: existingId },
				data: {
					...derivedData,
					...identity,
					companyId,
					lastCheckedAt: new Date(),
					tags: { set: [], ...tagOps },
				},
				select: postingSelect,
			});
			return { posting, created: false };
		}

		const posting = await tx.jobPosting.create({
			data: {
				...derivedData,
				...identity,
				userId,
				companyId,
				tags: tagOps,
			},
			select: postingSelect,
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
			orderBy: opts.orderBy ?? { capturedAt: 'desc' },
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
		locationRaw: _locationRaw,
		...data
	} = input;

	const bodyExtracted = data.body ? extractFromBody(data.body) : {};
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
		minYearsExperience:
			rawExtracted.minYearsExperience ??
			bodyExtracted.minYearsExperience ??
			undefined,
		applicantCount: data.applicantCount ?? bodyExtracted.applicantCount,
		salaryMin:
			rawExtracted.salary?.min ?? bodyExtracted.salary?.min ?? undefined,
		salaryMax:
			rawExtracted.salary?.max ?? bodyExtracted.salary?.max ?? undefined,
		salaryCurrency:
			rawExtracted.salary?.currency ??
			bodyExtracted.salary?.currency ??
			undefined,
		salaryPeriod:
			data.body !== undefined
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
		select: postingSelect,
	});
};

export const deletePosting = async (userId: string, id: string) => {
	const { count } = await prisma.jobPosting.deleteMany({
		where: { id, userId },
	});
	return count > 0;
};

export default {
	createOrUpdatePosting,
	findPostings,
	findPosting,
	updatePosting,
	deletePosting,
};
