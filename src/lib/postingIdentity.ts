import { createHash } from 'node:crypto';

export const canonicalizeUrl = (raw: string): string => {
	const u = new URL(raw);
	u.hash = '';
	for (const k of [...u.searchParams.keys()]) {
		if (/^(utm_|ref$|refId|trk|fbclid|gclid|mc_|_ga)/i.test(k)) {
			u.searchParams.delete(k);
		}
	}
	u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
	return u.toString().replace(/\/$/, '');
};

const extractors: Record<string, RegExp> = {
	LinkedIn: /\/jobs\/view\/(\d+)/,
	Indeed: /[?&]jk=([a-z0-9]+)/i,
	Greenhouse: /[?&]gh_jid=(\d+)/i,
	Lever: /\/([a-f0-9-]{36})(?:\?|$)/i,
};

export const extractSourceId = (
	url: string,
	source: string | null | undefined,
): string | null => {
	if (!source) return null;
	const re = extractors[source];
	if (!re) return null;
	return url.match(re)?.[1] ?? null;
};

export const contentFingerprint = (
	userId: string,
	companyId: string,
	title: string,
	city: string | null | undefined,
): string =>
	createHash('sha256')
		.update(
			[userId, companyId, title, city?.toLowerCase() ?? ''].join('\u0000'),
		)
		.digest('hex');
