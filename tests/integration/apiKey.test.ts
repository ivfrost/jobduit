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

let cookie!: string;

describe('API key management', () => {
	beforeEach(async () => {
		await resetDb(testPrisma);
		await redis.flushAll();

		await createTestUser(testPrisma, {
			email: TEST_USER_EMAIL,
			password: TEST_USER_PASSWORD,
		});

		const res = await request(testApp)
			.post('/api/auth/login')
			.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
			.expect(200);

		cookie = extractSid(res);
	});

	describe('POST /api/keys', () => {
		it('creates a key and returns the raw value once', async () => {
			const res = await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'extension' });

			expect(res.status).toBe(201);
			expect(res.body.raw).toMatch(/^jd_live_[a-f0-9]{64}$/);
			expect(res.body.id).toBeDefined();
			expect(res.body.prefix).toBe(res.body.raw.slice(0, 12));

			const stored = await testPrisma.apiKey.findUnique({
				where: { id: res.body.id },
			});
			expect(stored?.name).toBe('extension');
			expect(stored?.keyHash).not.toBe(res.body.raw);
		});

		it('rejects an unauthenticated request', async () => {
			await request(testApp)
				.post('/api/keys')
				.send({ name: 'extension' })
				.expect(401);
		});

		it('rejects a missing name', async () => {
			const res = await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({});

			expect(res.status).toBe(400);
			expect(res.body.fields).toHaveProperty('name');
		});
	});

	describe('GET /api/keys', () => {
		it('lists the user keys without the raw or hash', async () => {
			await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'one' })
				.expect(201);
			await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'two' })
				.expect(201);

			const res = await request(testApp)
				.get('/api/keys')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).toHaveLength(2);
			expect(res.body.map((k: { name: string }) => k.name).sort()).toEqual([
				'one',
				'two',
			]);
			for (const k of res.body) {
				expect(k).not.toHaveProperty('keyHash');
				expect(k).not.toHaveProperty('raw');
			}
		});

		it('does not leak keys belonging to other users', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			await testPrisma.apiKey.create({
				data: {
					userId: other.id,
					name: 'theirs',
					prefix: 'jd_live_aaaa',
					keyHash: 'a'.repeat(64),
				},
			});

			const res = await request(testApp)
				.get('/api/keys')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).toEqual([]);
		});

		it('rejects an unauthenticated request', async () => {
			await request(testApp).get('/api/keys').expect(401);
		});
	});

	describe('DELETE /api/keys/:id', () => {
		it('revokes the key so it can no longer authenticate', async () => {
			const created = await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'revoke-me' })
				.expect(201);

			await request(testApp)
				.delete(`/api/keys/${created.body.id}`)
				.set('Cookie', cookie)
				.expect(204);

			const stored = await testPrisma.apiKey.findUnique({
				where: { id: created.body.id },
			});
			expect(stored?.revokedAt).not.toBeNull();

			await request(testApp)
				.get('/api/postings')
				.set('X-API-Key', created.body.raw)
				.expect(401);
		});

		it('returns 404 for a key belonging to another user', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			const theirs = await testPrisma.apiKey.create({
				data: {
					userId: other.id,
					name: 'theirs',
					prefix: 'jd_live_aaaa',
					keyHash: 'a'.repeat(64),
				},
			});

			await request(testApp)
				.delete(`/api/keys/${theirs.id}`)
				.set('Cookie', cookie)
				.expect(404);
		});

		it('rejects an unauthenticated request', async () => {
			const created = await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'x' })
				.expect(201);

			await request(testApp).delete(`/api/keys/${created.body.id}`).expect(401);
		});

		it('rejects API key auth for key management', async () => {
			const created = await request(testApp)
				.post('/api/keys')
				.set('Cookie', cookie)
				.send({ name: 'x' })
				.expect(201);

			await request(testApp)
				.get('/api/keys')
				.set('X-API-Key', created.body.raw)
				.expect(403);

			await request(testApp)
				.post('/api/keys')
				.set('X-API-Key', created.body.raw)
				.send({ name: 'y' })
				.expect(403);
		});
	});
});
