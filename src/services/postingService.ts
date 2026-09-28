import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type {
	CreatePostingInput,
	GetPostingsOptions,
	UpdatePostingInput,
} from '../schemas/postings.js';

const postingSelect = {
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
	company: { select: { id: true, name: true, city: true, country: true } },
	tags: { select: { id: true, name: true } },
} satisfies Prisma.JobPostingSelect;

export const createPosting = async (
	userId: string,
	input: CreatePostingInput,
) => {
	const { company, tags, ...data } = input;

	const { id: companyId } = await prisma.company.upsert({
		where: { userId_name_city_country: { userId, ...company } },
		update: {},
		create: { userId, ...company },
		select: { id: true },
	});

	return prisma.jobPosting.create({
		data: {
			...data,
			userId,
			companyId,
			tags: {
				connectOrCreate: tags.map((name) => ({
					where: { name },
					create: { name },
				})),
			},
		},
		select: postingSelect,
	});
};

export const getPostings = async (
	userId: string,
	input: GetPostingsOptions,
) => {
	const where = { ...input.where, userId };

	const [data, total] = await Promise.all([
		prisma.jobPosting.findMany({
			where,
			orderBy: input.orderBy ?? { capturedAt: 'desc' },
			take: input.take,
			skip: input.skip,
			select: postingSelect,
		}),
		prisma.jobPosting.count({ where }),
	]);

	return {
		data,
		pagination: {
			limit: input.take,
			offset: input.skip,
			total,
			hasMore: input.skip + data.length < total,
		},
	};
};

export const getPosting = async (userId: string, id: string) => {
	return prisma.jobPosting.findFirst({
		where: { id, userId },
		select: postingSelect,
	});
};

export const updatePosting = async (
	userId: string,
	id: string,
	input: UpdatePostingInput,
) => {
	const { company, tags, ...data } = input;

	let companyId: string | undefined;
	if (company) {
		const c = await prisma.company.upsert({
			where: { userId_name_city_country: { userId, ...company } },
			update: {},
			create: { userId, ...company },
			select: { id: true },
		});
		companyId = c.id;
	}

	const { count } = await prisma.jobPosting.updateMany({
		where: { id, userId },
		data: {
			...data,
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
	createPosting,
	getPostings,
	getPosting,
	updatePosting,
	deletePosting,
};
