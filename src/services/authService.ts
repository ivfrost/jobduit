import bcrypt from 'bcryptjs';
import { SALT_ROUNDS } from '../constants.js';
import { prisma } from '../lib/prisma.js';

export const hashPassword = (password: string) =>
	bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (hash: string, password: string) =>
	bcrypt.compare(password, hash);

export const findByEmail = (email: string) =>
	prisma.user.findUnique({ where: { email } });

export const findById = (id: string) =>
	prisma.user.findUnique({
		where: { id },
		select: { id: true, email: true, role: true, createdAt: true },
	});

export default { hashPassword, verifyPassword, findByEmail, findById };
