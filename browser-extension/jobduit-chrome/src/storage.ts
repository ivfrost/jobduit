export type ApiConfig = {
	apiKey: string;
	apiUrl: string;
	autoAnalyze: boolean;
};

export const getApiConfig = async (): Promise<ApiConfig> => {
	const local = await chrome.storage.local.get([
		'apiKey',
		'apiUrl',
		'autoAnalyze',
	]);
	const sync = await chrome.storage.sync.get([
		'apiKey',
		'apiUrl',
		'autoAnalyze',
	]);
	const hasLocalConfig =
		typeof local.apiKey === 'string' || typeof local.apiUrl === 'string';
	if (!hasLocalConfig && typeof sync.apiKey === 'string') {
		await chrome.storage.local.set({
			apiKey: sync.apiKey,
			apiUrl: sync.apiUrl,
			autoAnalyze: sync.autoAnalyze,
		});
	}
	if (Object.keys(sync).length > 0) {
		await chrome.storage.sync.remove(['apiKey', 'apiUrl', 'autoAnalyze']);
	}
	const { apiKey, apiUrl, autoAnalyze } = hasLocalConfig ? local : sync;
	return {
		apiKey: typeof apiKey === 'string' ? apiKey : '',
		apiUrl: typeof apiUrl === 'string' ? apiUrl : '',
		autoAnalyze: autoAnalyze === true,
	};
};

export const saveApiConfig = (config: ApiConfig): Promise<void> =>
	chrome.storage.local.set(config);

export const isApiConfigured = (config: ApiConfig): boolean =>
	Boolean(config.apiKey && config.apiUrl);

export type ValidationResult = { ok: boolean; error?: string };

// Hit a protected endpoint with the key and surface the server's error, e.g.
// "Invalid API key".
export const validateApiConfig = async (
	config: Pick<ApiConfig, 'apiKey' | 'apiUrl'>,
): Promise<ValidationResult> => {
	try {
		const response = await fetch(
			`${config.apiUrl.replace(/\/$/, '')}/api/keys/validate`,
			{ method: 'POST', headers: { 'X-API-Key': config.apiKey } },
		);
		if (response.ok) return { ok: true };
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		return {
			ok: false,
			error: body?.error ?? `Request failed (${response.status})`,
		};
	} catch (error) {
		return { ok: false, error: String(error) };
	}
};
