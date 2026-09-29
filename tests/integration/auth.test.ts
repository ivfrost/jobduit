import request from 'supertest';
import { beforeEach, describe, expect, inject, it } from 'vitest';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../constants.js';
import { extractSid } from '../helpers/cookies.js';
import { createTestUser, resetDb } from '../helpers/db.js';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.REDIS_URL = inject('redisUrl');

const { default: testApp } = await import('../../src/app.js');
const { prisma: testPrisma } = await import('../../src/lib/prisma.js');
const { redis } = await import('../../src/lib/redis.js');

let user: Awaited<ReturnType<typeof createTestUser>>;
let cookie!: string;

const login = async () => {
	const res = await request(testApp)
		.post('/api/auth/login')
		.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
		.expect(200);
	return extractSid(res);
};

describe('Auth flows', () => {
	beforeEach(async () => {
		await resetDb(testPrisma);
		await redis.flushAll();
		user = await createTestUser(testPrisma, {
			email: TEST_USER_EMAIL,
			password: TEST_USER_PASSWORD,
		});
		cookie = await login();
	});

	describe('POST /api/auth/login', () => {
		it('logs in with valid credentials', async () => {
			const res = await request(testApp)
				.post('/api/auth/login')
				.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
				.expect(200);

			const cookie = extractSid(res);

			const me = await request(testApp)
				.get('/api/auth/me')
				.set('Cookie', cookie)
				.expect(200);

			expect(me.body).toMatchObject({ id: user.id, email: user.email });
		});

		it('rejects invalid credentials', async () => {
			const res = await request(testApp)
				.post('/api/auth/login')
				.send({ email: TEST_USER_EMAIL, password: 'wrong' });

			expect(res.status).toBe(401);
		});

		it('returns the same error for unknown email and wrong password', async () => {
			const unknown = await request(testApp)
				.post('/api/auth/login')
				.send({ email: 'nobody@jobdu.it', password: 'whatever' });

			const wrong = await request(testApp)
				.post('/api/auth/login')
				.send({ email: TEST_USER_EMAIL, password: 'wrong' });

			expect(unknown.status).toBe(401);
			expect(wrong.status).toBe(401);
			expect(unknown.body).toEqual(wrong.body);
		});

		it('stores a session in Redis after login', async () => {
			const keys = await redis.keys('session:*');
			expect(keys.length).toBeGreaterThan(0);
		});
	});

	describe('GET /api/auth/me', () => {
		it('returns the current user', async () => {
			const res = await request(testApp)
				.get('/api/auth/me')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).toMatchObject({ id: user.id, email: user.email });
			expect(res.body).not.toHaveProperty('passwordHash');
		});

		it('rejects an unauthenticated request', async () => {
			await request(testApp).get('/api/auth/me').expect(401);
		});
	});

	describe('POST /api/auth/logout', () => {
		it('destroys the session', async () => {
			await request(testApp)
				.post('/api/auth/logout')
				.set('Cookie', cookie)
				.expect(204);

			await request(testApp)
				.get('/api/auth/me')
				.set('Cookie', cookie)
				.expect(401);

			const keys = await redis.keys('session:*');
			expect(keys).toHaveLength(0);
		});

		it('succeeds even without a session', async () => {
			await request(testApp).post('/api/auth/logout').expect(204);
		});
	});
});
