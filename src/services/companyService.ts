import { type PrismaClientOrTx, prisma } from '../lib/prisma.js';
import type {
	CreateCompanyInput,
	GetCompaniesOptions,
	GetCompanyParams,
} from '../schemas/company.js';

export const findOrCreateCompany = async (
	userId: string,
	input: CreateCompanyInput,
	client: PrismaClientOrTx = prisma,
) => {
	const name = input.name.trim();
	const { city, country } = input;

	const existing = await client.company.findFirst({
		where: { userId, name: { equals: name, mode: 'insensitive' } },
		select: { id: true, name: true, city: true, country: true },
	});
	if (existing) return { ...existing, isNew: false };

	const created = await client.company.create({
		data: { userId, name, city, country },
		select: { id: true, name: true, city: true, country: true },
	});
	return { ...created, isNew: true };
};

export const getCompanies = async (
	userId: string,
	opts: GetCompaniesOptions,
) => {
	const where = { ...opts.where, userId };

	const [data, total] = await Promise.all([
		prisma.company.findMany({
			where,
			orderBy: opts.orderBy,
			take: opts.take,
			skip: opts.skip,
			select: { id: true, name: true, city: true, country: true },
		}),
		prisma.company.count({ where }),
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

export const getCompany = async (userId: string, params: GetCompanyParams) => {
	const { id } = params;
	return prisma.company.findFirst({
		where: { id, userId },
		select: { id: true, name: true, city: true, country: true },
	});
};

export const updateCompany = async (
	userId: string,
	params: GetCompanyParams,
	input: CreateCompanyInput,
) => {
	const { id } = params;

	const { count } = await prisma.company.updateMany({
		where: { id, userId },
		data: input,
	});
	if (count === 0) return null;

	return prisma.company.findUnique({
		where: { id },
		select: { id: true, name: true, city: true, country: true },
	});
};

export const deleteCompany = async (
	userId: string,
	params: GetCompanyParams,
) => {
	const { id } = params;

	const { count } = await prisma.company.deleteMany({
		where: { id, userId },
	});
	return count > 0;
};

export default {
	findOrCreateCompany,
	getCompanies,
	getCompany,
	updateCompany,
	deleteCompany,
};
