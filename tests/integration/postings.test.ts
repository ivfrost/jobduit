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
	companyNameRaw: 'Acme',
	capturedAt: '2026-10-01T00:00:00.000Z',
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
		it('rejects normalized, enriched, and nested company fields from the client', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					status: 'OPEN',
					workMode: 'REMOTE',
					salaryMin: 100000,
					summary: 'Client supplied summary',
					company: { name: 'Should not be accepted' },
					tags: ['backend'],
				})
				.expect(400);
		});

		it('rejects unsupported posting sources', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({ ...basePosting, source: 'COMPANY_SITE' })
				.expect(400);
		});

		it('creates a posting and its company', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(basePosting)
				.expect(201);

			expect(res.body).toMatchObject({
				title: basePosting.title,
				sourceUrl: basePosting.sourceUrl,
				source: null,
				company: { name: 'Acme', city: '', country: '' },
			});
		});

		it('returns the complete enriched posting from the detail endpoint', async () => {
			const created = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/enriched-detail',
					body: 'Fully remote role. Salary: €60,000 per year.',
				})
				.expect(201);

			await testPrisma.jobPosting.update({
				where: { id: created.body.id },
				data: {
					summary: 'A fully remote backend role.',
					category: 'ENGINEERING',
					analyzedAt: new Date('2026-10-01T12:00:00.000Z'),
					salaryRaw: '€60,000 per year',
				},
			});

			const res = await request(testApp)
				.get(`/api/postings/${created.body.id}`)
				.set('Cookie', cookie)
				.expect(200);

			expect(res.body).toMatchObject({
				id: created.body.id,
				title: basePosting.title,
				canonicalUrl: 'https://example.com/jobs/enriched-detail',
				summary: 'A fully remote backend role.',
				category: 'ENGINEERING',
				analyzedAt: '2026-10-01T12:00:00.000Z',
				salaryPeriod: 'YEAR',
				company: { name: 'Acme' },
				tags: [],
			});
			expect(res.body).not.toHaveProperty('body');
			expect(res.body).not.toHaveProperty('salaryRaw');
			expect(res.body).toHaveProperty('contentHash');
			expect(res.body).toHaveProperty('updatedAt');
			expect(res.body).toHaveProperty('lastCheckedAt');
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

			const created = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send(linkedinBase)
				.expect(201);
			expect(created.body.source).toBe('LINKED_IN');

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
					companyNameRaw: 'Initech',
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

		it('matches the salary period nearest to the salary', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/monthly-salary',
					body:
						'5+ years of experience required. ' +
						'Salary: €5,000 - €7,000 per month.',
				})
				.expect(201);

			expect(res.body.salaryPeriod).toBe('MONTH');
		});

		it('prefers explicit fields over extracted ones', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/explicit-wins',
					workModeRaw: 'Onsite',
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
			expect(res.body.salaryPeriod).toBeNull();
		});

		it('keeps salary period null when the body does not specify one', async () => {
			const res = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/salary-without-period',
					salaryRaw: '100k-150k USD',
					body: 'Salary range: 100k-150k USD.',
				})
				.expect(201);

			expect(res.body.salaryMin).toBe(100000);
			expect(res.body.salaryMax).toBe(150000);
			expect(res.body.salaryCurrency).toBe('USD');
			expect(res.body.salaryPeriod).toBeNull();
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

		it('clears the previous salary period when the updated body omits it', async () => {
			const created = await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://example.com/jobs/update-salary-period',
					body: 'Salary: €60,000 - €80,000 per year.',
				})
				.expect(201);

			expect(created.body.salaryPeriod).toBe('YEAR');

			const updated = await request(testApp)
				.put(`/api/postings/${created.body.id}`)
				.set('Cookie', cookie)
				.send({ body: 'Salary range: €60,000 - €80,000.' })
				.expect(200);

			expect(updated.body.salaryPeriod).toBeNull();
		});

		it('matches by content hash when URLs differ', async () => {
			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({ ...basePosting, source: 'LINKED_IN' })
				.expect(201);

			await request(testApp)
				.post('/api/postings')
				.set('Cookie', cookie)
				.send({
					...basePosting,
					sourceUrl: 'https://acme.com/careers/backend',
					source: null,
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
