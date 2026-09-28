import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type { GetPostingsOptions } from '../schemas/postings.js';

export const getPostings = async (
	input: GetPostingsOptions & { userId: string },
) => {
	const { userId, status, companyId, limit, offset } = input;

	const where: Prisma.JobPostingWhereInput = {
		userId,
		...(status && { status }),
		...(companyId && { companyId }),
	};

	const [data, total] = await Promise.all([
		prisma.jobPosting.findMany({
			where,
			select: {
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
				company: {
					select: { id: true, name: true, city: true, country: true },
				},
				tags: {
					select: { id: true, name: true },
				},
			},
			orderBy: { capturedAt: 'desc' },
			take: limit,
			skip: offset,
		}),
		prisma.jobPosting.count({ where }),
	]);

	return {
		data,
		pagination: {
			limit,
			offset,
			total,
			hasMore: offset + data.length < total,
		},
	};
};

export default {
	getPostings,
};
