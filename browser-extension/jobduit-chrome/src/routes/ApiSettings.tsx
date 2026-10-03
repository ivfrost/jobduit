import { Link } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import { ActionBar } from '../components/FooterSlot';
import Input from '../components/Input';
import { useApiConfig } from '../hooks/useApiConfig';
import { apiFieldsSchema } from '../schemas/api';
import { saveApiConfig, validateApiConfig } from '../storage';

const FORM_ID = 'api-form';
const DRAFT_KEY = 'api-settings-draft';

interface Draft {
	apiKey: string;
	apiUrl: string;
	autoAnalyze: boolean;
}

type PersistedDraft = Omit<Draft, 'apiKey'>;

function loadDraft(): PersistedDraft | null {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<Draft>;
		if (
			typeof parsed.apiUrl !== 'string' ||
			typeof parsed.autoAnalyze !== 'boolean'
		) {
			return null;
		}
		const draft = {
			apiUrl: parsed.apiUrl,
			autoAnalyze: parsed.autoAnalyze,
		};
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		return draft;
	} catch {
		return null;
	}
}

function saveDraft(draft: PersistedDraft) {
	localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
	localStorage.removeItem(DRAFT_KEY);
}

type FieldName = 'apiKey' | 'apiUrl' | 'autoAnalyze';
type FieldErrors = Partial<Record<FieldName, string[]>>;

// True only when neither field has any content
function isUnconfigured(values: Draft): boolean {
	return values.apiKey.trim() === '' && values.apiUrl.trim() === '';
}

// No errors when the form is empty (not configured)
// Otherwise both fields are required and validated.
function validateFields(values: Draft): FieldErrors {
	if (isUnconfigured(values)) return {};

	const result = apiFieldsSchema.safeParse(values);
	if (result.success) return {};

	const fieldErrors: FieldErrors = {};
	for (const issue of result.error.issues) {
		const field = issue.path[0] as FieldName;
		(fieldErrors[field] ??= []).push(issue.message);
	}
	return fieldErrors;
}

type LoadStatus = 'idle' | 'valid' | 'invalid';

export default function ApiSettings() {
	const { config, loaded } = useApiConfig();

	const [initialDraft] = useState(() => loadDraft());

	const [apiKey, setApiKey] = useState('');
	const [apiUrl, setApiUrl] = useState(initialDraft?.apiUrl ?? '');
	const [autoAnalyze, setAutoAnalyze] = useState(
		initialDraft?.autoAnalyze ?? false,
	);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');

	const {
		apiKey: configApiKey,
		apiUrl: configApiUrl,
		autoAnalyze: configAutoAnalyze,
	} = config;

	const dirty =
		apiKey !== configApiKey ||
		apiUrl !== configApiUrl ||
		autoAnalyze !== configAutoAnalyze;

	const hasErrors = Object.keys(errors).length > 0;

	const reset = () => {
		setApiKey(configApiKey);
		setApiUrl(configApiUrl);
		setAutoAnalyze(configAutoAnalyze);
		setErrors({});
		setSaved(false);
		setLoadStatus('idle');
		clearDraft();
	};

	// On load: validate stored config (or restored draft) and reflect result.
	useEffect(() => {
		if (!loaded) return;

		const source: Draft = {
			apiKey: configApiKey,
			...(initialDraft ?? {
				apiUrl: configApiUrl,
				autoAnalyze: configAutoAnalyze,
			}),
		};

		// Nothing configured yet: no warnings, no badge.
		if (isUnconfigured(source)) {
			setErrors({});
			setLoadStatus('idle');
			setApiUrl(initialDraft?.apiUrl ?? configApiUrl);
			setApiKey(configApiKey);
			setAutoAnalyze(initialDraft?.autoAnalyze ?? configAutoAnalyze);
			return;
		}

		const fieldErrors = validateFields(source);
		setErrors(fieldErrors);
		setLoadStatus(Object.keys(fieldErrors).length ? 'invalid' : 'valid');

		setApiUrl(initialDraft?.apiUrl ?? configApiUrl);
		setApiKey(configApiKey);
		setAutoAnalyze(initialDraft?.autoAnalyze ?? configAutoAnalyze);
	}, [loaded, initialDraft, configApiKey, configApiUrl, configAutoAnalyze]);

	// Persist the draft while editing.
	useEffect(() => {
		if (!loaded) return;
		if (dirty) {
			saveDraft({ apiUrl, autoAnalyze });
		} else {
			clearDraft();
		}
	}, [loaded, dirty, apiKey, apiUrl, autoAnalyze]);

	// Any edit after load invalidates the "loaded is valid" badge.
	useEffect(() => {
		if (!dirty) return;
		const setIdle = () => setLoadStatus('idle');
		setIdle();
	}, [dirty]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaved(false);
		setErrors({});
		setSaving(true);

		const values = { apiKey, apiUrl, autoAnalyze };

		// Empty form — nothing to do.
		if (isUnconfigured(values)) {
			setSaving(false);
			return;
		}

		const fieldErrors = validateFields(values);
		if (Object.keys(fieldErrors).length) {
			setErrors(fieldErrors);
			setSaving(false);
			return;
		}

		try {
			const result = await validateApiConfig({ apiKey, apiUrl });

			if (result.ok) {
				await saveApiConfig({ apiKey, apiUrl, autoAnalyze });
				clearDraft();
				setSaved(true);
				setLoadStatus('valid');
			} else {
				setErrors({ apiKey: [result.error || 'Invalid API key'] });
			}
		} catch (error) {
			setErrors({
				apiKey: [
					error instanceof Error ? error.message : 'Failed to save API config',
				],
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-6">
			<Link
				to="/settings"
				className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
				<span className="font-semibold">←</span>
				<span>Back</span>
			</Link>
			<div className="mt-2 flex h-9 items-center">
				<h2 className="text-lg font-semibold">API configuration</h2>
			</div>

			{loadStatus === 'valid' && !dirty && (
				<p className="mt-2 text-sm text-success">
					Loaded configuration is valid.
				</p>
			)}
			{loadStatus === 'invalid' && !dirty && (
				<p className="mt-2 text-sm text-danger">
					Loaded configuration is invalid — please fix the fields below.
				</p>
			)}

			<form
				id={FORM_ID}
				onSubmit={onSubmit}
				noValidate
				className="mt-4 space-y-4">
				<Input
					label="Server URL"
					value={apiUrl}
					onChange={(e) => setApiUrl(e.target.value)}
					placeholder="http://localhost:3000"
					errors={errors.apiUrl}
				/>
				<Input
					type="password"
					label="API Key"
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
					placeholder="jd_live_…"
					errors={errors.apiKey}
				/>

				<label className="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						checked={autoAnalyze}
						onChange={(e) => setAutoAnalyze(e.target.checked)}
						className="mt-0.5 h-4 w-4 shrink-0 accent-accent-4"
					/>
					<span className="flex flex-col gap-0.5">
						<span className="leading-5">Auto analyze new additions</span>
						<span className="text-xs text-ink-subtle-lite">
							Generates summary and tags for new additions automatically.
						</span>
					</span>
				</label>
			</form>

			<ActionBar
				formId={FORM_ID}
				onDiscard={reset}
				disabled={!loaded || saving || !dirty}
				saving={saving}
				status={
					saved && !hasErrors && !dirty ? 'Saved'
					: loadStatus === 'valid' && !dirty ?
						'Valid'
					:	undefined
				}
			/>
		</div>
	);
}
