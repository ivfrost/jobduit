import type { Response } from 'supertest';

export const extractSid = (res: Response): string => {
	const raw = res.headers['set-cookie'];
	const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
	const sid = list.find((c) => c.startsWith('sid='));
	if (!sid) throw new Error('sid cookie not set');
	const [value] = sid.split(';');
	if (!value) throw new Error('malformed sid cookie');
	return value;
};
