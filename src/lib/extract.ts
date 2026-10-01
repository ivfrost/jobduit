export type SalaryPeriod = 'YEAR' | 'MONTH' | 'DAY' | 'HOUR';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type PostingStatus = 'OPEN' | 'CLOSED';

export type Salary = {
	min: number | null;
	max: number | null;
	currency: string | null; // ISO 4217 when known, else null
	period: SalaryPeriod | null;
	raw: string;
};

export type ExtractedPosting = {
	workMode: WorkMode | null;
	minYearsExperience: number | null;
	applicantCount: number | null;
	salary: Salary | null;
	status?: PostingStatus | null;
};

export const extractWorkMode = (body: string): WorkMode | null => {
	const t = body.toLowerCase();

	const hybrid =
		/\bhybrid\b|\b\d+\s+days?\s+(?:in|at|from)[- ]?(?:the\s+)?office\b|\b\d+\s+days?\s+(?:on[- ]?site|onsite)\b/.test(
			t,
		);
	const remote =
		/\b(?:fully|100%|entirely|completely)\s+remote\b|\bremote\b|\bwork\s+from\s+home\b|\bwfh\b|\btelecommut\w*/.test(
			t,
		);
	const onsite = /\bon[- ]?site\b|\bin[- ]office\b|\bin[- ]person\b/.test(t);
	const remoteNegated =
		/\b(?:not|no|non)[- ]?\s*(?:a\s+)?(?:fully\s+)?(?:remote|hybrid)\b/.test(t);

	// Days-in-office or an explicit hybrid mention is the most specific signal,
	// so it wins even when the posting also calls itself remote-friendly.
	if (hybrid) return 'HYBRID';

	// A remote claim only counts when it is not the negated phrase itself.
	if (remote && !remoteNegated) return 'REMOTE';

	if (remoteNegated || onsite) return 'ONSITE';

	return null;
};

// Language that talks about the company's age rather than the candidate's
// experience. Checked around a match to reject "founded 10 years ago".
const COMPANY_HISTORY_RE =
	/\b(?:founded|established|in\s+business|since\s+\d{4}|of\s+runway|our\s+company|the\s+company|serving\s+(?:clients|customers))\b/;

const isCompanyHistory = (t: string, index: number): boolean => {
	const before = t.slice(Math.max(0, index - 40), index);
	const after = t.slice(index, Math.min(t.length, index + 25));
	return COMPANY_HISTORY_RE.test(`${before} ${after}`);
};

export const extractMinYears = (body: string): number | null => {
	const t = body.toLowerCase();

	const patterns: RegExp[] = [
		// Range first: "3-5 years" gives 3, not 5
		/\b(\d{1,2})\s*(?:-|–|—|to)\s*\d{1,2}\s*\+?\s*(?:years?|yrs?)\b/,
		// Explicit qualifier: "at least 5 years", "minimum of 5 years"
		/\b(?:at\s+least|minimum(?:\s+of)?|min\.?|over|more\s+than)\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/,
		// Plus suffix: "5+ years"
		/\b(\d{1,2})\s*\+\s*(?:years?|yrs?)\b/,
		// Plain "5 years", lowest confidence
		/\b(\d{1,2})\s*(?:years?|yrs?)\b/,
	];

	for (const re of patterns) {
		const m = t.match(re);
		if (!m?.[1] || m.index === undefined) continue;
		if (isCompanyHistory(t, m.index)) continue;

		const n = Number(m[1]);
		if (Number.isFinite(n) && n <= 40) return n;
	}

	return null;
};

export const extractApplicantCount = (body: string): number | null => {
	const m = body.match(
		/\b(\d+(?:[.,]\d+)?)\s*([km])?\s*(?:applicants?|candidates?)\b/i,
	);
	if (!m?.[1]) return null;

	const n = Number(m[1].replace(',', '.'));
	if (!Number.isFinite(n)) return null;

	return Math.round(applySuffix(n, m[2] ?? ''));
};

const CLOSED_RE =
	/\b(?:closed|filled|expired|no\s+longer\s+(?:accepting|available|hiring)|position\s+(?:has\s+been\s+)?filled|applications?\s+(?:are\s+)?closed|(?:job|role|position)\s+is\s+closed|this\s+posting\s+has\s+expired)\b/i;
const OPEN_RE =
	/\b(?:open|active|now\s+hiring|actively\s+hiring|accepting\s+applications|apply\s+(?:now|today))\b/i;

export const extractStatus = (body: string): PostingStatus | null => {
	const t = body.toLowerCase();
	if (CLOSED_RE.test(t)) return 'CLOSED';
	if (OPEN_RE.test(t)) return 'OPEN';
	return null;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
	'€': 'EUR',
	'£': 'GBP',
	'₹': 'INR',
	'₽': 'RUB',
	'₩': 'KRW',
	R$: 'BRL',
	zł: 'PLN',
	Kč: 'CZK',
	Ft: 'HUF',
};

// Symbols whose meaning depends on where the job is. Keyed by ISO 3166-1
// alpha-2, taken from the normalized location when available.
const AMBIGUOUS_SYMBOLS: Record<string, Record<string, string>> = {
	$: {
		US: 'USD',
		CA: 'CAD',
		AU: 'AUD',
		NZ: 'NZD',
		SG: 'SGD',
		HK: 'HKD',
		MX: 'MXN',
		IN: 'INR',
		BR: 'BRL',
	},
	'¥': { JP: 'JPY', CN: 'CNY' },
	kr: { SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK' },
};

// Used when the country is unknown or has no mapping above.
const AMBIGUOUS_FALLBACK: Record<string, string> = {
	$: 'USD',
	'¥': 'JPY',
	kr: 'SEK',
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
		/(?:\b(?:per\s+(?:annum|yr|year)|annual(?:ly)?|p\.?a\.?)\b|\/\s*(?:yr|year)\b)/i,
		'YEAR',
	],
	[
		/(?:\b(?:per\s+(?:mo|month)|monthly|p\.?m\.?)\b|\/\s*(?:mo|month)\b)/i,
		'MONTH',
	],
	[/(?:\b(?:per\s+(?:week|wk)|weekly)\b|\/\s*(?:wk|week)\b)/i, 'DAY'],
	[/(?:\b(?:per\s+day|daily)\b|\/\s*(?:day|d)\b)/i, 'DAY'],
	[/(?:\b(?:per\s+(?:hr|hour)|hourly|p\.?h\.?)\b|\/\s*(?:hr|hour)\b)/i, 'HOUR'],
];

// Words that mark a figure as compensation
const SALARY_CONTEXT_RE =
	/\b(?:salary|salaries|compensation|comp|pay|package|remuneration|wage|wages|rate|gross|net|ote|on[- ]target|per\s+(?:annum|year|month|week|day|hour)|annual(?:ly)?|monthly|hourly|daily)\b/i;

// Words that mark a figure as something else entirely
const NON_SALARY_CONTEXT_RE =
	/\b(?:funding|fundrais\w*|raised|raise|valuation|valued|revenue|arr|mrr|series\s+[a-e]\b|seed\s+round|investment|investors?|market\s+cap|budget|contract\s+value|grant|prize|employees|customers|users|downloads|sq\.?\s?f(?:ee)?t|square\s+(?:feet|meters|metres))\b/i;

// Anything this large is far more likely funding or revenue than salary
const LARGE_AMOUNT = 1_000_000;
const CONTEXT_WINDOW = 80;

const toNumber = (raw: string): number => {
	const s = raw.replace(/\s/g, '');
	if (!s) return NaN;

	const lastDot = s.lastIndexOf('.');
	const lastComma = s.lastIndexOf(',');
	const lastSep = Math.max(lastDot, lastComma);
	if (lastSep === -1) return Number(s);

	// Both separators present: the later one is the decimal point.
	// The same separator twice: all grouping.
	// A single separator: decimal unless it has a clean 3-digit tail.
	const separators = s.match(/[.,]/g)?.length ?? 0;
	const digitsAfterLast = s.length - lastSep - 1;
	const isDecimal =
		lastDot !== -1 && lastComma !== -1
			? true
			: separators > 1
				? false
				: digitsAfterLast !== 3;

	if (!isDecimal) {
		const grouped = Number(s.replace(/[.,]/g, ''));
		return Number.isFinite(grouped) ? grouped : NaN;
	}

	const intPart = s.slice(0, lastSep).replace(/[.,]/g, '');
	const n = Number(`${intPart}.${s.slice(lastSep + 1)}`);
	return Number.isFinite(n) ? n : NaN;
};

const applySuffix = (value: number, suffix: string): number => {
	const s = suffix.toLowerCase();
	if (s === 'k') return value * 1_000;
	if (s === 'm') return value * 1_000_000;
	return value;
};

const resolveCurrency = (
	raw: string | undefined,
	country?: string | null,
): string | null => {
	if (!raw) return null;
	const trimmed = raw.trim();

	if (CURRENCY_SYMBOLS[trimmed]) return CURRENCY_SYMBOLS[trimmed];

	const ambiguous = AMBIGUOUS_SYMBOLS[trimmed];
	if (ambiguous) {
		const byCountry = country ? ambiguous[country.toUpperCase()] : undefined;
		return byCountry ?? AMBIGUOUS_FALLBACK[trimmed] ?? null;
	}

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

export const extractSalary = (
	body: string,
	country?: string | null,
): Salary | null => {
	for (const m of body.matchAll(SALARY_RE)) {
		const g = m.groups;
		if (!g?.min) continue;

		const idx = m.index ?? 0;
		const before = body.slice(Math.max(0, idx - CONTEXT_WINDOW), idx);
		const after = body.slice(
			idx + m[0].length,
			idx + m[0].length + CONTEXT_WINDOW,
		);
		const context = `${before} ${after}`;

		// Funding rounds, revenue, headcount, budgets: not compensation.
		if (NON_SALARY_CONTEXT_RE.test(context)) continue;

		const period = detectPeriod(after) ?? detectPeriod(before);

		const min = applySuffix(toNumber(g.min), g.minSuffix ?? '');
		if (!Number.isFinite(min)) continue;

		const max = g.max ? applySuffix(toNumber(g.max), g.maxSuffix ?? '') : null;
		if (max !== null && (!Number.isFinite(max) || max < min)) continue;

		// "€1.2M base salary" is fine; a bare "5,000,000" is not. Large
		// figures need an explicit salary word nearby.
		if (min >= LARGE_AMOUNT && !SALARY_CONTEXT_RE.test(context)) continue;

		// Lower floor for hourly and daily rates
		const floor = period === 'HOUR' ? 10 : period === 'DAY' ? 50 : 1_000;
		if (min < floor) continue;

		return {
			min,
			max,
			currency:
				resolveCurrency(g.cur1, country) ??
				resolveCurrency(g.cur2, country) ??
				resolveCurrency(g.cur3, country),
			period,
			raw: m[0].trim(),
		};
	}
	return null;
};

export const extractFromBody = (
	body: string | null | undefined,
	country?: string | null,
): Partial<ExtractedPosting> => {
	if (!body) return {};
	const extracted = {
		workMode: extractWorkMode(body),
		minYearsExperience: extractMinYears(body),
		applicantCount: extractApplicantCount(body),
		salary: extractSalary(body, country),
		status: extractStatus(body),
	};
	if (extracted.status === null) {
		const { status: _status, ...withoutStatus } = extracted;
		return withoutStatus;
	}
	return extracted;
};
