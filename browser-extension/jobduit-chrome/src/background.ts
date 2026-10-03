type CaptureMessage = {
	type: 'CAPTURE_POSTING';
	posting: Record<string, unknown>;
};

chrome.runtime.onMessage.addListener(
	(message: CaptureMessage, _sender, sendResponse) => {
		if (message?.type !== 'CAPTURE_POSTING') return;
		capture(message.posting)
			.then(sendResponse)
			.catch((error: unknown) =>
				sendResponse({ ok: false, error: String(error) }),
			);
		return true;
	},
);

const capture = async (posting: Record<string, unknown>) => {
	const { apiKey, apiUrl, autoAnalyze } = await getApiConfig();
	if (!apiKey || !apiUrl) return { ok: false, error: 'Not configured' };

	const base = String(apiUrl).replace(/\/$/, '');
	const headers = {
		'Content-Type': 'application/json',
		'X-API-Key': String(apiKey),
	};

	const response = await fetch(`${base}/api/postings`, {
		method: 'POST',
		headers,
		body: JSON.stringify(posting),
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		return {
			ok: false,
			error: body?.error ?? `Request failed (${response.status})`,
		};
	}

	const created = (await response.json()) as { id?: string };
	if (autoAnalyze && created.id) {
		// Fire and forget so the button doesn't wait on the LLM.
		void fetch(`${base}/api/postings/${created.id}/analyze`, {
			method: 'POST',
			headers,
		}).catch((error: unknown) => console.error('analyze failed', error));
	}

	return { ok: true, status: response.status };
};
import { getApiConfig } from './storage';
