import { describe, expect, it } from 'vitest';
import {
	extractApplicantCount,
	extractFromBody,
	extractMinYears,
	extractSalary,
	extractWorkMode,
} from '../../src/lib/extract.js';

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
		['Not remote — candidates must relocate', 'ONSITE'],
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
		expect(extractApplicantCount('Over 2k candidates applied')).toBe(2);
	});

	it('returns null when not present', () => {
		expect(extractApplicantCount('Join our growing team')).toBeNull();
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
