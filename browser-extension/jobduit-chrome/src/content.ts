import TurndownService from 'turndown';

console.log('[jobduit] content script running');

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
});

type Source = 'LINKED_IN' | 'INDEED' | 'GREENHOUSE' | 'LEVER';

const detectSource = (): Source | null => {
	const host = location.hostname;
	if (host.includes('linkedin.com')) return 'LINKED_IN';
	if (host.includes('indeed.com')) return 'INDEED';
	if (host.includes('greenhouse.io')) return 'GREENHOUSE';
	if (host.includes('lever.co')) return 'LEVER';
	return null;
};

const text = (el: Element | null): string => el?.textContent?.trim() ?? '';

// LinkedIn job description: the expandable box, falling back to the "About the
// job" section, then the whole <main>.
const linkedinBody = (): HTMLElement | null => {
	const box = document.querySelector<HTMLElement>(
		'[data-testid="expandable-text-box"]',
	);
	if (box) return box;

	const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
		/about the job/i.test(h.textContent ?? ''),
	);
	const container = heading?.closest('div');
	if (container) return container as HTMLElement;

	return document.querySelector('main');
};

const scrape = () => {
	const source = detectSource();

	const title =
		text(document.querySelector('h1')) ||
		text(document.querySelector('[class*="job-title"]')) ||
		document.title;

	const company =
		source === 'LINKED_IN'
			? text(document.querySelector('a[href*="/company/"]'))
			: '';

	const bodyEl =
		source === 'LINKED_IN'
			? linkedinBody()
			: (document.querySelector('main') ?? document.body);

	// Location · posted date · applicant count live in one paragraph, as three
	// b4lfr2 value spans separated by dots.
	const meta = document.querySelector('p.b4lfr2');
	const parts = meta
		? Array.from(meta.querySelectorAll('span.b4lfr2')).map(
				(s) => s.textContent?.trim() ?? '',
			)
		: [];

	return {
		title,
		bodyMarkdown: bodyEl ? turndown.turndown(bodyEl.innerHTML) : null,
		sourceUrl: location.href,
		source,
		companyNameRaw: company || 'Unknown',
		locationRaw: parts[0] ?? null,
		postedAtRaw: parts[1] ?? null,
		applicantCountRaw: parts[2] ?? null,
		capturedAt: new Date().toISOString(),
	};
};

const send = async (
	posting: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> => {
	try {
		const response = (await chrome.runtime.sendMessage({
			type: 'CAPTURE_POSTING',
			posting,
		})) as { ok: boolean; error?: string } | undefined;
		return { ok: Boolean(response?.ok), error: response?.error };
	} catch {
		return { ok: false, error: 'Service worker unavailable' };
	}
};

// LinkedIn's job Save button. Its aria-label is "Save the job", which is more
// stable than the obfuscated row classes.
const findSaveButton = (): HTMLButtonElement | null =>
	Array.from(document.querySelectorAll('button')).find((b) =>
		/save the job/i.test(b.getAttribute('aria-label') ?? ''),
	) ?? null;

const injectButton = (): void => {
	// Only ever one button in the document.
	if (document.querySelector('[data-jobduit-save]')) return;

	const save = findSaveButton();
	if (!save) return;

	const button = document.createElement('button');
	button.type = 'button';
	button.setAttribute('data-jobduit-save', 'true');
	button.textContent = 'Save to Jobduit';
	button.style.cssText = [
		'background:#0a66c2',
		'color:#fff',
		'border:none',
		'border-radius:9999px',
		'padding:0.375rem 0.75rem',
		'font-size:0.875rem',
		'font-weight:600',
		'cursor:pointer',
		'white-space:nowrap',
		'margin-inline-start:0.5rem',
		'flex-shrink:0',
		'align-self:center',
	].join(';');

	button.addEventListener('click', () => {
		button.disabled = true;
		button.textContent = 'Saving…';
		void send(scrape()).then((result) => {
			button.textContent = result.ok ? 'Saved' : 'Failed';
			if (result.error) button.title = result.error;
			button.disabled = false;
		});
	});

	// Save sits inside its own small grid. Insert after that grid so the button
	// joins the surrounding button row instead of colliding inside a grid cell.
	const container = save.parentElement;
	container?.insertAdjacentElement('afterend', button);
};

const isLinkedIn = detectSource() === 'LINKED_IN';

const tryInject = () => {
	if (!isLinkedIn) return;
	injectButton();
};

// The buttons mount after SPA navigation, so watch the DOM for them. LinkedIn only.
if (isLinkedIn) {
	new MutationObserver(tryInject).observe(document.body, {
		childList: true,
		subtree: true,
	});
	tryInject();
}
