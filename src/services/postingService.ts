import { extractFromBody } from '../lib/extract.js';
import {
	canonicalizeUrl,
	contentFingerprint,
	extractSourceId,
} from '../lib/postingIdentity.js';
import { prisma } from '../lib/prisma.js';
import {
	type CreatePostingInput,
	type GetPostingParams as FindPostingParams,
	type GetPostingsOptions as FindPostingsOptions,
	postingSelect,
	type UpdatePostingInput,
} from '../schemas/postings.js';
import { findOrCreateCompany } from './companyService.js';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const findExistingPosting = async (
	tx: Tx,
	userId: string,
	canonicalUrl: string,
	source: string | null,
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
	input: CreatePostingInput,
) => {
	const { company, tags, ...data } = input;

	const canonicalUrl = canonicalizeUrl(data.sourceUrl);
	const sourceId = extractSourceId(data.sourceUrl, data.source);

	// Best-effort extraction from the body. Explicit fields from the extension
	// always win; extractors only fill gaps.
	const extracted = extractFromBody(data.body);

	const enriched = {
		...data,
		workMode: data.workMode ?? extracted.workMode ?? null,
		minYearsExperience:
			data.minYearsExperience ?? extracted.minYearsExperience ?? null,
		applicantCount: data.applicantCount ?? extracted.applicantCount ?? null,
		salaryMin: extracted.salary?.min ?? null,
		salaryMax: extracted.salary?.max ?? null,
		salaryCurrency: extracted.salary?.currency ?? null,
		salaryPeriod: extracted.salary?.period ?? null,
		salaryRaw: extracted.salary?.raw ?? null,
	};

	return prisma.$transaction(async (tx) => {
		const { id: companyId } = await findOrCreateCompany(userId, company, tx);

		const contentHash = contentFingerprint(
			userId,
			companyId,
			enriched.title,
			enriched.city ?? null,
		);

		const existingId = await findExistingPosting(
			tx,
			userId,
			canonicalUrl,
			enriched.source ?? null,
			sourceId,
			contentHash,
		);

		const identity = { canonicalUrl, contentHash, sourceId };

		const tagOps = {
			connectOrCreate: (tags ?? []).map((name) => ({
				where: { name },
				create: { name },
			})),
		};

		if (existingId) {
			const posting = await tx.jobPosting.update({
				where: { id: existingId },
				data: {
					...enriched,
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
				...enriched,
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
		select: postingSelect,
	});
};

export const updatePosting = async (
	userId: string,
	params: FindPostingParams,
	input: UpdatePostingInput,
) => {
	const { id } = params;
	const { company, tags, ...data } = input;

	// Re-run extractors only if body is being updated
	const extracted = data.body ? extractFromBody(data.body) : {};

	const enriched = {
		...data,
		workMode: data.workMode ?? extracted.workMode ?? undefined,
		minYearsExperience:
			data.minYearsExperience ?? extracted.minYearsExperience ?? undefined,
		applicantCount:
			data.applicantCount ?? extracted.applicantCount ?? undefined,
	};

	let companyId: string | undefined;
	if (company) {
		const c = await prisma.company.upsert({
			where: {
				userId_name_city_country: {
					userId,
					name: company.name,
					city: company.city ?? '',
					country: company.country ?? '',
				},
			},
			update: {},
			create: { userId, ...company },
			select: { id: true },
		});
		companyId = c.id;
	}

	const { count } = await prisma.jobPosting.updateMany({
		where: { id, userId },
		data: {
			...enriched,
			...(companyId && { companyId }),
			...(tags && {
				tags: {
					set: [],
					connectOrCreate: tags.map((name: string) => ({
						where: { name },
						create: { name },
					})),
				},
			}),
		},
	});

	if (count === 0) return null;

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
