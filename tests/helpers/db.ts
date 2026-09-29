import bcrypt from 'bcryptjs';
import { SALT_ROUNDS } from '../../src/constants.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { UserRole } from '../../src/generated/prisma/enums.js';
import { generateApiKey } from '../../src/lib/apiKey.js';
import {
	type ApiKeyCreateInput,
	ApiKeyCreateSchema,
} from '../../src/schemas/apiKey.js';

interface UserData {
	email: string;
	password: string;
	role?: UserRole;
}

export const createTestUser = (
	client: PrismaClient,
	{ email, password, role }: UserData,
) => {
	return client.user.create({
		data: {
			email,
			passwordHash: bcrypt.hashSync(password, SALT_ROUNDS),
			role: role || UserRole.USER,
		},
	});
};

export const createTestApiKey = async (
	client: PrismaClient,
	userId: string,
	input: ApiKeyCreateInput,
) => {
	const parsed = ApiKeyCreateSchema.parse(input);
	const { name } = parsed;

	const { raw, prefix, keyHash } = generateApiKey();

	const apiKey = await client.apiKey.create({
		data: { userId: userId, name, prefix, keyHash },
	});

	return { raw, id: apiKey.id };
};

export async function resetDb(prisma: PrismaClient) {
	await prisma.applicationNote.deleteMany();
	await prisma.application.deleteMany();
	await prisma.jobPosting.deleteMany();
	await prisma.company.deleteMany();
	await prisma.apiKey.deleteMany();
	await prisma.invite.deleteMany();
	await prisma.user.deleteMany();
	await prisma.jobTag.deleteMany();
}
