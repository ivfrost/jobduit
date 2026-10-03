import { apiFieldsSchema } from './schemas/api';
import type { ApiConfig } from './storage';

export type Posting = {
	id: string;
	title: string;
	source: string | null;
	status: string;
	workMode: string | null;
	city: string | null;
	country: string | null;
	postedAt: string | null;
	capturedAt: string;
	analyzedAt: string | null;
	minYearsExperience: number | null;
	applicantCount: number | null;
	salaryMin: number | null;
	salaryMax: number | null;
	salaryCurrency: string | null;
	salaryPeriod: string | null;
	company: { id: string; name: string };
	tags: { id: string; name: string }[];
};

export type PostingDetail = Posting & {
	sourceUrl: string;
	bodyMarkdown: string | null;
	canonicalUrl: string;
	contentHash: string;
	sourceId: string | null;
	lastCheckedAt: string | null;
	updatedAt: string;
	summary: string | null;
	category: string | null;
	analyzedAt: string | null;
};

type PostingsResponse = {
	data: Posting[];
};

const base = (config: ApiConfig) => config.apiUrl.replace(/\/$/, '');

export const fetchPostings = async (config: ApiConfig): Promise<Posting[]> => {
	if (!config.apiKey || !config.apiUrl) {
		throw new Error('API not configured');
	}
	if (apiFieldsSchema.safeParse(config).error) {
		throw new Error('Invalid API configuration');
	}
	const response = await fetch(`${base(config)}/api/postings`, {
		headers: { 'X-API-Key': config.apiKey },
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${response.status})`);
	}
	const body = (await response.json()) as PostingsResponse;
	return body.data;
};

export const fetchPosting = async (
	config: ApiConfig,
	id: string,
): Promise<PostingDetail> => {
	if (!config.apiKey || !config.apiUrl) {
		throw new Error('API not configured');
	}
	if (apiFieldsSchema.safeParse(config).error) {
		throw new Error('Invalid API configuration');
	}
	const response = await fetch(`${base(config)}/api/postings/${id}`, {
		headers: { 'X-API-Key': config.apiKey },
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${response.status})`);
	}
	return (await response.json()) as PostingDetail;
};

export const analyzePosting = async (
	config: ApiConfig,
	id: string,
): Promise<void> => {
	if (!config.apiKey || !config.apiUrl) {
		throw new Error('API not configured');
	}
	if (apiFieldsSchema.safeParse(config).error) {
		throw new Error('Invalid API configuration');
	}
	const response = await fetch(`${base(config)}/api/postings/${id}/analyze`, {
		method: 'POST',
		headers: { 'X-API-Key': config.apiKey },
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${response.status})`);
	}
};

export const deletePosting = async (
	config: ApiConfig,
	id: string,
): Promise<void> => {
	if (!config.apiKey || !config.apiUrl) {
		throw new Error('API not configured');
	}
	if (apiFieldsSchema.safeParse(config).error) {
		throw new Error('Invalid API configuration');
	}
	const response = await fetch(`${base(config)}/api/postings/${id}`, {
		method: 'DELETE',
		headers: { 'X-API-Key': config.apiKey },
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `Request failed (${response.status})`);
	}
};
