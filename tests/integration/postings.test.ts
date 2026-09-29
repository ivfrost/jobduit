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

const basePosting = {
	sourceUrl: 'https://example.com/jobs/backend-engineer',
	title: 'Backend Engineer',
	company: { name: 'Acme', city: 'Madrid', country: 'ES' },
};

describe('Postings API', () => {
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
		it('creates a posting and its company', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(basePosting)
				.expect(201);

			expect(res.body).toMatchObject({
				title: basePosting.title,
				sourceUrl: basePosting.sourceUrl,
				company: { name: 'Acme', city: 'Madrid', country: 'ES' },
			});
		});

		it('updates instead of duplicating on repeated save', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(basePosting)
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({ ...basePosting, title: 'Backend Engineer (updated)' })
				.expect(200);

			const count = await testPrisma.jobPosting.count({
				where: { userId: user.id },
			});
			expect(count).toBe(1);

			const posting = await testPrisma.jobPosting.findFirst({
				where: { userId: user.id },
			});
			expect(posting?.title).toBe('Backend Engineer (updated)');
		});

		it('dedupes by canonical URL when tracking params differ', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(basePosting)
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: `${basePosting.sourceUrl}?utm_source=linkedin&ref=feed`,
				})
				.expect(200);

			const count = await testPrisma.jobPosting.count({
				where: { userId: user.id },
			});
			expect(count).toBe(1);
		});

		it('dedupes by board-native source ID when URLs differ', async () => {
			const linkedinBase = {
				...basePosting,
				source: 'LinkedIn',
				sourceUrl: 'https://www.linkedin.com/jobs/view/4012345678',
			};

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(linkedinBase)
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...linkedinBase,
					sourceUrl: 'https://www.linkedin.com/jobs/view/4012345678?trk=abc',
				})
				.expect(200);

			const count = await testPrisma.jobPosting.count({
				where: { userId: user.id },
			});
			expect(count).toBe(1);
		});

		it('creates a company from a name alone, with empty city/country', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/no-location',
					company: { name: 'Initech' },
				})
				.expect(201);

			expect(res.body.company).toMatchObject({
				name: 'Initech',
				city: '',
				country: '',
			});
		});

		it('lists postings scoped to the authenticated user', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(basePosting)
				.expect(201);

			const res = await request(testApp)
				.get('/api/postings')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body.data).toBeInstanceOf(Array);
			expect(res.body.data).toHaveLength(1);
		});

		it('does not list postings belonging to other users', async () => {
			const other = await createTestUser(testPrisma, {
				email: 'other@jobdu.it',
				password: 'x',
			});
			const otherCompany = await testPrisma.company.create({
				data: { userId: other.id, name: 'Other', city: '', country: '' },
			});
			await testPrisma.jobPosting.create({
				data: {
					userId: other.id,
					companyId: otherCompany.id,
					sourceUrl: 'https://other.example/job',
					canonicalUrl: 'https://other.example/job',
					contentHash: 'a'.repeat(64),
					title: 'Their job',
				},
			});

			const res = await request(testApp)
				.get('/api/postings')
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body.data).toEqual([]);
		});

		it('can reach session-only routes like key management', async () => {
			await request(testApp).get('/api/keys').set('Cookie', cookie).expect(200);
		});
	});

	describe('body extraction', () => {
		it('extracts work mode, years, and salary from the body', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/with-body',
					body:
						'Fully remote role. 5+ years of experience required. ' +
						'Salary: €60,000 - €80,000 per year.',
				})
				.expect(201);

			expect(res.body).toMatchObject({
				workMode: 'REMOTE',
				minYearsExperience: 5,
				salaryMin: 60000,
				salaryMax: 80000,
				salaryCurrency: 'EUR',
				salaryPeriod: 'YEAR',
			});
		});

		it('prefers explicit fields over extracted ones', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/explicit-wins',
					workMode: 'ONSITE',
					body: 'Fully remote position',
				})
				.expect(201);

			expect(res.body.workMode).toBe('ONSITE');
		});

		it('leaves extracted fields null when body is missing', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/no-body',
				})
				.expect(201);

			expect(res.body.workMode).toBeNull();
			expect(res.body.minYearsExperience).toBeNull();
			expect(res.body.salaryMin).toBeNull();
		});

		it('re-extracts when the body is updated', async () => {
			const created = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/update-body',
				})
				.expect(201);

			expect(created.body.minYearsExperience).toBeNull();

			const updated = await request(testApp)
				.put(`/api/postings/${created.body.id}`)
				.set('Cookie', cookie)
				.send({ body: '3+ years of experience required' })
				.expect(200);

			expect(updated.body.minYearsExperience).toBe(3);
		});

		it('matches by content hash when URLs differ', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({ ...basePosting, source: 'LinkedIn' })
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://acme.com/careers/backend',
					source: 'Company site',
				})
				.expect(200);

			const count = await testPrisma.jobPosting.count({
				where: { userId: user.id },
			});
			expect(count).toBe(1);
		});
	});

	describe('via API key (extension)', () => {
		it('creates a posting and its company', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(basePosting)
				.expect(201);

			expect(res.body).toMatchObject({
				title: basePosting.title,
				sourceUrl: basePosting.sourceUrl,
			});
		});

		it('updates instead of duplicating on repeated save', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(basePosting)
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Authorization', `Bearer ${apiKey}`)
				.send({ ...basePosting, title: 'Backend Engineer (updated)' })
				.expect(200);

			const count = await testPrisma.jobPosting.count({
				where: { userId: user.id },
			});
			expect(count).toBe(1);
		});

		it('rejects a revoked key', async () => {
			await testPrisma.apiKey.update({
				where: { id: apiKeyId },
				data: { revokedAt: new Date() },
			});

			await request(testApp)
				.post('/api/postings')
				.set('Authorization', `Bearer ${apiKey}`)
				.send(basePosting)
				.expect(401);
		});

		it('rejects an invalid key', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Authorization', 'Bearer not-a-real-key')
				.send(basePosting)
				.expect(401);
		});

		it('cannot reach session-only routes like key management', async () => {
			await request(testApp)
				.get('/api/keys')
				.set('Authorization', `Bearer ${apiKey}`)
				.expect(403);
		});
	});

	it('rejects unauthenticated requests', async () => {
		await request(testApp).get('/api/postings').expect(401);
	});
});
