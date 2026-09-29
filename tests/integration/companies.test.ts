import request from 'supertest';
import { beforeEach, describe, expect, inject, it } from 'vitest';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../constants.js';
import { extractSid } from '../helpers/cookies.js';
import { createTestApiKey, createTestUser, resetDb } from '../helpers/db.js';

process.env.DATABASE_URL = inject('databaseUrl');
process.env.REDIS_URL = inject('redisUrl');

const { default: testApp } = await import('../../src/app.js');
const { prisma: testPrisma } = await import('../../src/lib/prisma.js');
const { redis } = await import('../../src/lib/redis.js');

let user: Awaited<ReturnType<typeof createTestUser>>;
let cookie!: string;
let apiKey!: string;
let apiKeyId!: string;

const baseCompany = {
	name: 'Acme',
	city: 'Madrid',
	country: 'ES',
};

describe('Companies API', () => {
	beforeEach(async () => {
		await resetDb(testPrisma);
		await redis.flushAll();

		user = await createTestUser(testPrisma, {
			email: TEST_USER_EMAIL,
			password: TEST_USER_PASSWORD,
		});

		const res = await request(testApp)
			.post('/api/auth/login')
			.send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
			.expect(200);

		cookie = extractSid(res);

		const key = await createTestApiKey(testPrisma, user.id, {
			name: 'test extension key',
		});
		apiKey = key.raw;
		apiKeyId = key.id;
	});

	describe('via session cookie', () => {
		it('creates a company', async () => {
			const res = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send(baseCompany)
				.expect(201);

			expect(res.body).toMatchObject(baseCompany);

			const stored = await testPrisma.company.findUnique({
				where: { id: res.body.id },
			});
			expect(stored?.userId).toBe(user.id);
		});

		it('defaults city and country when omitted', async () => {
			const res = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send({ name: 'Initech' })
				.expect(201);

			expect(res.body).toMatchObject({
				name: 'Initech',
				city: '',
				country: '',
			});
		});

		it('rejects a missing name', async () => {
			const res = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send({ city: 'Madrid' })
				.expect(400);

			expect(res.body.fields).toHaveProperty('name');
		});

		it('lists companies scoped to the authenticated user', async () => {
			await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send(baseCompany)
				.expect(201);

			const res = await request(testApp)
				.get('/api/companies')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0]).toMatchObject(baseCompany);
		});

		it('does not leak other users companies', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			await testPrisma.company.create({
				data: { ...baseCompany, userId: other.id },
			});

			const res = await request(testApp)
				.get('/api/companies')
				.set('Cookie', cookie);

			expect(res.status).toBe(200);
		});

		it('returns a company by id', async () => {
			const created = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send(baseCompany)
				.expect(201);

			const res = await request(testApp)
				.get(`/api/companies/${created.body.id}`)
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).toMatchObject(baseCompany);
		});

		it('returns 404 for another user company', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			const theirs = await testPrisma.company.create({
				data: { ...baseCompany, userId: other.id },
			});

			await request(testApp)
				.get(`/api/companies/${theirs.id}`)
				.set('Cookie', cookie)
				.expect(404);
		});

		it('returns 404 for an unknown id', async () => {
			await request(testApp)
				.get('/api/companies/00000000-0000-0000-0000-000000000000')
				.set('Cookie', cookie)
				.expect(404);
		});

		it('updates the company', async () => {
			const created = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send(baseCompany)
				.expect(201);

			const res = await request(testApp)
				.put(`/api/companies/${created.body.id}`)
				.set('Cookie', cookie)
				.send({ name: 'Acme Corp' })
				.expect(200);

			expect(res.body.name).toBe('Acme Corp');

			const stored = await testPrisma.company.findUnique({
				where: { id: created.body.id },
			});
			expect(stored?.name).toBe('Acme Corp');
		});

		it('cannot update another user company', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			const theirs = await testPrisma.company.create({
				data: { ...baseCompany, userId: other.id },
			});

			await request(testApp)
				.put(`/api/companies/${theirs.id}`)
				.set('Cookie', cookie)
				.send({ name: 'Nope' })
				.expect(404);
		});

		it('deletes the company', async () => {
			const created = await request(testApp)
				.post('/api/companies')
				.set('Cookie', cookie)
				.send(baseCompany)
				.expect(201);

			await request(testApp)
				.delete(`/api/companies/${created.body.id}`)
				.set('Cookie', cookie)
				.expect(204);

			const stored = await testPrisma.company.findUnique({
				where: { id: created.body.id },
			});
			expect(stored).toBeNull();
		});

		it('cannot delete another user company', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			const theirs = await testPrisma.company.create({
				data: { ...baseCompany, userId: other.id },
			});

			await request(testApp)
				.delete(`/api/companies/${theirs.id}`)
				.set('Cookie', cookie)
				.expect(404);
		});
	});

	describe('via API key (extension)', () => {
		it('creates a company', async () => {
			const res = await request(testApp)
				.post('/api/companies')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(baseCompany)
				.expect(201);

			expect(res.body).toMatchObject(baseCompany);
		});

		it('lists companies scoped to the authenticated user', async () => {
			await request(testApp)
				.post('/api/companies')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(baseCompany)
				.expect(201);

			const res = await request(testApp)
				.get('/api/companies')
				.set('Authorization', `Bearer ${apiKey}`)
				.expect(200);

			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0]).toMatchObject(baseCompany);
		});

		it('rejects a revoked key', async () => {
			await testPrisma.apiKey.update({
				where: { id: apiKeyId },
				data: { revokedAt: new Date() },
			});

			await request(testApp)
				.post('/api/companies')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(baseCompany)
				.expect(401);
		});
	});

	it('rejects unauthenticated requests', async () => {
		await request(testApp).get('/api/companies').expect(401);
	});
});
