import { describe, expect, it } from 'vitest';
import {
	extractApplicantCount,
	extractFromBody,
	extractLocation,
	extractMinYears,
	extractPostedAt,
	extractSalary,
	extractStatus,
	extractWorkMode,
} from '../../src/lib/extract.js';

describe('extractStatus', () => {
	const cases: Array<[string, ReturnType<typeof extractStatus>]> = [
		// A captured status field is the whole string.
		['Open', 'OPEN'],
		['Active', 'OPEN'],
		['Actively hiring', 'OPEN'],
		// In prose, only explicit hiring phrases count.
		['Apply now for this role', 'OPEN'],
		['We are now hiring a backend engineer', 'OPEN'],
		['This position is open for applications', 'OPEN'],
		// Bare words in prose prove nothing.
		['We maintain a large open-source project', null],
		['Open to remote candidates', null],
		['The company has been active since 2015', null],
		['Competitive salary and benefits', null],
		['Open until filled', 'OPEN'],
		['Applications are now open', 'OPEN'],
		// A captured status field is the whole string here too.
		['Closed', 'CLOSED'],
		['Filled', 'CLOSED'],
		// Closed markers win, including when both appear.
		['No longer accepting applications', 'CLOSED'],
		['This posting has expired', 'CLOSED'],
		['Position filled. Apply now to join our talent pool', 'CLOSED'],
		['This job has been filled', 'CLOSED'],
		['Applications are now closed', 'CLOSED'],
		['Listing has expired', 'CLOSED'],
		// Bare words in prose prove nothing here either.
		['Our closed-source product is used by thousands', null],
		['We closed a Series B round in 2024', null],
		['The role has been open since March', null],
	];

	for (const [input, expected] of cases) {
		it(`${JSON.stringify(input)} → ${expected}`, () => {
			expect(extractStatus(input)).toBe(expected);
		});
	}
});

describe('extractWorkMode', () => {
	const cases: Array<[string, ReturnType<typeof extractWorkMode>]> = [
		['Fully remote position', 'REMOTE'],
		['Work from home, EU timezone', 'REMOTE'],
		['This is a remote-first team', 'REMOTE'],
		['Hybrid: 3 days in office per week', 'HYBRID'],
		['Hybrid role based in Madrid', 'HYBRID'],
		['Onsite only, no remote work', 'ONSITE'],
		['Must be in-office 5 days', 'ONSITE'],
		['In-person collaboration required', 'ONSITE'],
		['Not remote - candidates must relocate', 'ONSITE'],
		['Competitive salary and benefits', null],
	];

	for (const [input, expected] of cases) {
		it(`${input.slice(0, 40)} → ${expected}`, () => {
			expect(extractWorkMode(input)).toBe(expected);
		});
	}
});

describe('extractMinYears', () => {
	const cases: Array<[string, number | null]> = [
		['5+ years of experience required', 5],
		['At least 3 years in a similar role', 3],
		['Minimum 7 years of backend development', 7],
		['Minimum of 4 years', 4],
		['3-5 years of experience', 3],
		['3 to 5 years experience', 3],
		['Looking for 10 years of experience', 10],
		['No prior experience necessary', null],
		['We hire engineers of all levels', null],
	];

	for (const [input, expected] of cases) {
		it(`${input.slice(0, 40)} → ${expected}`, () => {
			expect(extractMinYears(input)).toBe(expected);
		});
	}
});

describe('extractApplicantCount', () => {
	it('extracts a plain count', () => {
		expect(extractApplicantCount('42 applicants so far')).toBe(42);
	});

	it('extracts a compact count', () => {
		expect(extractApplicantCount('Over 2k candidates applied')).toBe(2000);
	});

	it('returns null when not present', () => {
		expect(extractApplicantCount('Join our growing team')).toBeNull();
	});

	it('handles null and undefined', () => {
		expect(extractApplicantCount(null)).toBeNull();
		expect(extractApplicantCount(undefined)).toBeNull();
	});

	it('parses a bare count with a plus sign', () => {
		expect(extractApplicantCount('100+')).toBe(100);
		expect(extractApplicantCount('200+ applicants')).toBe(200);
	});

	it('parses a bare number', () => {
		expect(extractApplicantCount('42')).toBe(42);
	});

	it('parses LinkedIn "people clicked apply" phrasing', () => {
		expect(extractApplicantCount('Over 100 people clicked apply')).toBe(100);
		expect(extractApplicantCount('100 people clicked apply')).toBe(100);
	});

	it('does not match a bare number inside prose', () => {
		expect(extractApplicantCount('5+ years of experience')).toBeNull();
	});
});

describe('extractPostedAt', () => {
	const ref = new Date('2026-10-01T12:00:00.000Z');

	it('anchors relative dates to the reference', () => {
		expect(extractPostedAt('1 day ago', ref)).toEqual(
			new Date('2026-09-30T12:00:00.000Z'),
		);
		expect(extractPostedAt('3 weeks ago', ref)).toEqual(
			new Date('2026-09-10T12:00:00.000Z'),
		);
		expect(extractPostedAt('a day ago', ref)).toEqual(
			new Date('2026-09-30T12:00:00.000Z'),
		);
	});

	it('handles today, yesterday and just now', () => {
		expect(extractPostedAt('today', ref)).toEqual(ref);
		expect(extractPostedAt('yesterday', ref)).toEqual(
			new Date('2026-09-30T12:00:00.000Z'),
		);
		expect(extractPostedAt('just now', ref)).toEqual(ref);
	});

	it('parses absolute dates', () => {
		expect(extractPostedAt('2026-09-20T10:00:00.000Z')).toEqual(
			new Date('2026-09-20T10:00:00.000Z'),
		);
	});

	it('returns null for empty or unparseable input', () => {
		expect(extractPostedAt(null)).toBeNull();
		expect(extractPostedAt('')).toBeNull();
		expect(extractPostedAt('Posted whenever')).toBeNull();
	});
});

describe('extractSalary', () => {
	it('parses a EUR range with year period', () => {
		const r = extractSalary('Salary: €60,000 - €80,000 per year.');
		expect(r).toMatchObject({
			min: 60000,
			max: 80000,
			currency: 'EUR',
			period: 'YEAR',
		});
	});

	it('parses compact USD range', () => {
		const r = extractSalary('Compensation: $120k-$150k');
		expect(r).toMatchObject({
			min: 120000,
			max: 150000,
			currency: 'USD',
		});
	});

	it('parses EU thousands separators', () => {
		const r = extractSalary('60.000 - 80.000 EUR');
		expect(r).toMatchObject({
			min: 60000,
			max: 80000,
			currency: 'EUR',
		});
	});

	it('detects monthly period', () => {
		const r = extractSalary('€4,500 per month');
		expect(r).toMatchObject({
			min: 4500,
			period: 'MONTH',
			currency: 'EUR',
		});
	});

	it('detects hourly period', () => {
		const r = extractSalary('Rate: $75/hour');
		expect(r).toMatchObject({
			min: 75,
			period: 'HOUR',
			currency: 'USD',
		});
	});

	it('returns null for competitive salary', () => {
		expect(extractSalary('Competitive salary, great team.')).toBeNull();
	});

	it('ignores numbers too small to be a salary', () => {
		expect(extractSalary('We have 500 employees worldwide.')).toBeNull();
	});

	it('rejects a range where max < min', () => {
		expect(extractSalary('€80,000 - €60,000')).toBeNull();
	});
});

describe('extractFromBody', () => {
	it('extracts everything it can from one body', () => {
		const body =
			'We are hiring a fully remote Backend Engineer with 5+ years of experience. ' +
			'Compensation: €60,000 - €80,000 per year. 42 applicants so far.';
		expect(extractFromBody(body)).toEqual({
			workMode: 'REMOTE',
			minYearsExperience: 5,
			applicantCount: 42,
			salary: expect.objectContaining({
				min: 60000,
				max: 80000,
				currency: 'EUR',
				period: 'YEAR',
			}),
		});
	});

	it('returns empty object for null/undefined body', () => {
		expect(extractFromBody(null)).toEqual({});
		expect(extractFromBody(undefined)).toEqual({});
	});
});

describe('extractLocation', () => {
	const cases: Array<[string | null, ReturnType<typeof extractLocation>]> = [
		['Barcelona, Spain', { city: 'Barcelona', country: 'ES' }],
		['Remote - Barcelona, Spain', { city: 'Barcelona', country: 'ES' }],
		['Hybrid: Barcelona, Spain', { city: 'Barcelona', country: 'ES' }],
		['London, UK', { city: 'London', country: 'GB' }],
		['Austin, TX, USA', { city: 'Austin', country: 'US' }],
		['Barcelona, ES', { city: 'Barcelona', country: 'ES' }],
		['Madrid, España', { city: 'Madrid', country: 'ES' }],
		[
			'Sant Cugat del Vallès, Barcelona, Spain',
			{
				city: 'Sant Cugat del Vallès',
				country: 'ES',
			},
		],
		['Spain', { city: null, country: 'ES' }],
		['Singapore', { city: null, country: 'SG' }],
		['Berlin', { city: 'Berlin', country: null }],
		['Barcelona, Eixample', { city: 'Barcelona', country: null }],
		['Remote', { city: null, country: null }],
		['', { city: null, country: null }],
		[null, { city: null, country: null }],
	];

	for (const [input, expected] of cases) {
		it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
			expect(extractLocation(input)).toEqual(expected);
		});
	}
});
