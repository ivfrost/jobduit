import request from 'supertest';
import { beforeEach, describe, expect, inject, it } from 'vitest';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../constants.js';
import { createTestUser, resetDb } from '../helpers/db.js';

process.env.DATABASE_URL = inject('databaseUrl' as never) as string;
process.env.REDIS_URL = inject('redisUrl' as never) as string;

const { default: testApp } = await import('../../src/app.js');
const { prisma: testPrisma } = await import('../../src/lib/prisma.js');
const { redis } = await import('../../src/lib/redis.js');

let user: Awaited<ReturnType<typeof createTestUser>>;

describe('Auth flows', () => {
	beforeEach(async () => {
		await resetDb(testPrisma);
		await redis.flushAll();
		user = await createTestUser(testPrisma, {
			email: TEST_USER_EMAIL,
			password: TEST_USER_PASSWORD,
		});
	});

	it('logs in with valid credentials', async () => {
		const res = await request(testApp)
			.post('/api/auth/login')
			.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: user.id, email: user.email });
		expect(res.headers['set-cookie']).toBeDefined();
	});

	it('rejects invalid credentials', async () => {
		const res = await request(testApp)
			.post('/api/auth/login')
			.send({ email: TEST_USER_EMAIL, password: 'wrong' });

		expect(res.status).toBe(401);
	});

	it('stores a session in Redis after login', async () => {
		await request(testApp)
			.post('/api/auth/login')
			.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
			.expect(200);

		const keys = await redis.keys('session:*');
		expect(keys.length).toBeGreaterThan(0);
	});
});
