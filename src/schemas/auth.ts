import { z } from 'zod';
import { UserModelSchema } from '../generated/zod/schemas/variants/pure/User.pure.js';

export const loginSchema = z.object({
	email: z.email().meta({ example: 'user@jobdu.it' }),
	password: z.string().min(1).meta({ example: 'your-password' }),
});

export const publicUserSchema = UserModelSchema.pick({
	id: true,
	email: true,
	role: true,
	createdAt: true,
}).extend({
	id: z.uuid().meta({ example: '00000000-0000-0000-0000-000000000000' }),
	email: z.email().meta({ example: 'user@jobdu.it' }),
	role: z.enum(['USER', 'ADMIN']).meta({ example: 'USER' }),
	createdAt: z.iso.datetime().meta({ example: '2026-01-01T00:00:00.000Z' }),
});
