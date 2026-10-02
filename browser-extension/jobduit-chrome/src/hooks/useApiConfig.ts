import { useEffect, useState } from 'react';
import {
	type ApiConfig,
	getApiConfig,
	isApiConfigured,
} from '../storage';

const EMPTY: ApiConfig = { apiKey: '', apiUrl: '', autoAnalyze: false };

export function useApiConfig() {
	const [config, setConfig] = useState<ApiConfig>(EMPTY);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let alive = true;

		getApiConfig().then((c) => {
			if (!alive) return;
			setConfig(c);
			setLoaded(true);
		});

		const onChange = (
			changes: Record<string, chrome.storage.StorageChange>,
		) => {
			setConfig((prev) => {
				const next = { ...prev };
				if ('apiKey' in changes) {
					next.apiKey = String(changes.apiKey?.newValue ?? '');
				}
				if ('apiUrl' in changes) {
					next.apiUrl = String(changes.apiUrl?.newValue ?? '');
				}
				if ('autoAnalyze' in changes) {
					next.autoAnalyze = changes.autoAnalyze?.newValue === true;
				}
				return next;
			});
		};

		chrome.storage.onChanged.addListener(onChange);
		return () => {
			alive = false;
			chrome.storage.onChanged.removeListener(onChange);
		};
	}, []);

	return { config, loaded, isConfigured: isApiConfigured(config) };
}
