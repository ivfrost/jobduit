export type SalaryPeriod = 'YEAR' | 'MONTH' | 'DAY' | 'HOUR';

export type Salary = {
	min: number | null;
	max: number | null;
	currency: string | null; // ISO 4217 when known, else null
	period: SalaryPeriod | null;
	raw: string;
};

export const extractWorkMode = (
	body: string,
): 'REMOTE' | 'HYBRID' | 'ONSITE' | null => {
	const t = body.toLowerCase();
	// Explicit negative first — "not remote" is common enough
	if (/\b(not|no)\s+(remote|hybrid)\b/.test(t)) return 'ONSITE';
	if (/\bhybrid\b|\d+\s+days?\s+in[- ]?(the\s+)?office\b/.test(t))
		return 'HYBRID';
	if (
		/\b(fully\s+)?remote\b|\bwork\s+from\s+home\b|\bwfh\b|\btelecommut/.test(t)
	)
		return 'REMOTE';
	if (/\bonsite\b|\bon[- ]site\b|\bin[- ]office\b|\bin[- ]person\b/.test(t))
		return 'ONSITE';
	return null;
};

export const extractMinYears = (body: string): number | null => {
	const t = body.toLowerCase();

	// Range first — "3-5 years" gives 3, not 5
	const range = t.match(
		/\b(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/,
	);
	if (range?.[1]) return Number(range[1]);

	// Explicit qualifier — "at least 5 years", "minimum 5 years", "over 5 years"
	const qualified = t.match(
		/\b(?:at\s+least|minimum(?:\s+of)?|min\.?|over|more\s+than)\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/,
	);
	if (qualified?.[1]) return Number(qualified[1]);

	// Plus suffix — "5+ years"
	const plus = t.match(/\b(\d{1,2})\s*\+\s*(?:years?|yrs?)\b/);
	if (plus?.[1]) return Number(plus[1]);

	// Plain "5 years" — lowest confidence
	const plain = t.match(/\b(\d{1,2})\s*(?:years?|yrs?)\b/);
	if (plain?.[1]) return Number(plain[1]);

	return null;
};

export const extractApplicantCount = (body: string): number | null => {
	const match = body.match(
		/\b(\d+(?:[.,]\d+)?\s*[km]?)\s+(?:applicants?|candidates?)\b/i,
	);
	const raw = match?.[1];
	if (!raw) return null;
	return Number(raw.replace(/[^\d.]/g, ''));
};

const CURRENCY_SYMBOLS: Record<string, string> = {
	$: 'USD',
	'€': 'EUR',
	'£': 'GBP',
	'¥': 'JPY',
	'₹': 'INR',
	'₽': 'RUB',
	'₩': 'KRW',
	R$: 'BRL',
	kr: 'SEK',
	zł: 'PLN',
	Kč: 'CZK',
	Ft: 'HUF',
};

const CURRENCY_CODES =
	'USD|EUR|GBP|JPY|CAD|AUD|CHF|SEK|NOK|DKK|PLN|CZK|HUF|RON|BGN|HRK|RUB|INR|BRL|MXN|ARS|CLP|COP|PEN|SGD|HKD|NZD|KRW|CNY|ZAR|ILS|TRY|AED|SAR';

// One number, EU or US formatting, optional k/m suffix
const NUM = String.raw`\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const CURRENCY_PATTERN = String.raw`\$|€|£|¥|₹|₽|₩|R\$|kr|zł|Kč|Ft|\b(?:${CURRENCY_CODES})\b`;

const SALARY_RE = new RegExp(
	String.raw`(?<cur1>${CURRENCY_PATTERN})?\s*` +
		String.raw`(?<min>${NUM})\s*(?<minSuffix>[kmKM]?)` +
		String.raw`(?:\s*(?:-|–|—|to|až|bis|à)\s*` +
		String.raw`(?<cur2>${CURRENCY_PATTERN})?\s*` +
		String.raw`(?<max>${NUM})\s*(?<maxSuffix>[kmKM]?))?` +
		String.raw`(?:\s*(?<cur3>${CURRENCY_PATTERN}))?`,
	'gi',
);

// Look a small window before/after the match for period hints
const PERIOD_PATTERNS: Array<[RegExp, SalaryPeriod]> = [
	[
		/\b(?:per\s+(?:annum|yr|year)|annual(?:ly)?|\/\s*(?:yr|year)|p\.?a\.?)\b/i,
		'YEAR',
	],
	[/\b(?:per\s+(?:mo|month)|monthly|\/\s*(?:mo|month)|p\.?m\.?)\b/i, 'MONTH'],
	[/\b(?:per\s+day|daily|\/\s*(?:day|d))\b/i, 'DAY'],
	[/\b(?:per\s+(?:hr|hour)|hourly|\/\s*(?:hr|hour)|p\.?h\.?)\b/i, 'HOUR'],
];

const toNumber = (raw: string): number => {
	// "60.000" or "60,000" → 60000; "60,5" or "60.5" → 60.5
	// Heuristic: if the last separator has exactly 3 digits after it, it's a thousands sep.
	const lastSep = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
	if (lastSep === -1) return Number(raw.replace(/\s/g, ''));

	const decimals = raw.length - lastSep - 1;
	const cleaned =
		decimals === 3
			? raw.replace(/[.,\s]/g, '') // thousands separator
			: raw.replace(/[,\s]/g, '').replace(',', '.'); // comma is decimal sep

	const n = Number(cleaned);
	return Number.isFinite(n) ? n : NaN;
};

const applySuffix = (value: number, suffix: string): number => {
	const s = suffix.toLowerCase();
	if (s === 'k') return value * 1_000;
	if (s === 'm') return value * 1_000_000;
	return value;
};

const resolveCurrency = (raw: string | undefined): string | null => {
	if (!raw) return null;
	const trimmed = raw.trim();
	if (CURRENCY_SYMBOLS[trimmed]) return CURRENCY_SYMBOLS[trimmed];
	const upper = trimmed.toUpperCase();
	if (upper.length === 3 && CURRENCY_CODES.split('|').includes(upper))
		return upper;
	return null;
};

const detectPeriod = (context: string): SalaryPeriod | null => {
	for (const [re, period] of PERIOD_PATTERNS) {
		if (re.test(context)) return period;
	}
	return null;
};

export const extractSalary = (body: string): Salary | null => {
	for (const m of body.matchAll(SALARY_RE)) {
		const g = m.groups;
		if (!g?.min) continue;

		const start = Math.max(0, (m.index ?? 0) - 40);
		const end = Math.min(body.length, (m.index ?? 0) + m[0].length + 40);
		const period = detectPeriod(body.slice(start, end));

		const min = applySuffix(toNumber(g.min), g.minSuffix ?? '');
		if (!Number.isFinite(min)) continue;

		const max = g.max ? applySuffix(toNumber(g.max), g.maxSuffix ?? '') : null;
		if (max !== null && (!Number.isFinite(max) || max < min)) continue;

		// Lower floor for hourly and daily rates
		const floor = period === 'HOUR' ? 10 : period === 'DAY' ? 50 : 1_000;
		if (min < floor) continue;

		return {
			min,
			max,
			currency:
				resolveCurrency(g.cur1) ??
				resolveCurrency(g.cur2) ??
				resolveCurrency(g.cur3),
			period,
			raw: m[0].trim(),
		};
	}
	return null;
};

export const extractFromBody = (body: string | null | undefined) => {
	if (!body) return {};
	return {
		workMode: extractWorkMode(body),
		minYearsExperience: extractMinYears(body),
		applicantCount: extractApplicantCount(body),
		salary: extractSalary(body),
	};
};
