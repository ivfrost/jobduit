export type Theme = 'sage' | 'ocean' | 'rose' | 'sand';
export type Mode = 'light' | 'dark' | 'system';

export const DEFAULT_THEME: Theme = 'sage';
export const DEFAULT_MODE: Mode = 'dark';

export const THEMES: { id: Theme; label: string; swatch: string[] }[] = [
	{
		id: 'sage',
		label: 'Sage',
		swatch: ['#eaede4', '#8a9e8b', '#5c7060', '#1e2620'],
	},
	{
		id: 'ocean',
		label: 'Ocean',
		swatch: ['#e6ecf0', '#8aa3b8', '#4f6f8a', '#17222b'],
	},
	{
		id: 'rose',
		label: 'Rose',
		swatch: ['#f0e8e8', '#c4939c', '#9c5563', '#2a1c1f'],
	},
	{
		id: 'sand',
		label: 'Sand',
		swatch: ['#efeadd', '#c2a86a', '#8a6d2b', '#2a2418'],
	},
];

const systemDark = () =>
	window.matchMedia('(prefers-color-scheme: dark)').matches;

export const applyTheme = (theme: Theme, mode: Mode) => {
	const el = document.documentElement;
	el.dataset.theme = theme;
	el.classList.toggle(
		'dark',
		mode === 'dark' || (mode === 'system' && systemDark()),
	);
};

export const saveTheme = (theme: Theme, mode: Mode) =>
	chrome.storage.local.set({ theme, mode });

export const loadTheme = async (): Promise<{ theme: Theme; mode: Mode }> => {
	const s = await chrome.storage.local.get(['theme', 'mode']);
	const theme =
		s.theme === 'sage' ||
		s.theme === 'ocean' ||
		s.theme === 'rose' ||
		s.theme === 'sand' ?
			s.theme
		:	DEFAULT_THEME;
	const mode =
		s.mode === 'light' || s.mode === 'dark' || s.mode === 'system' ?
			s.mode
		:	DEFAULT_MODE;
	return {
		theme,
		mode,
	};
};

// call once at startup (main.tsx) before render
export const initTheme = async () => {
	const { theme, mode } = await loadTheme();
	applyTheme(theme, mode);
	window
		.matchMedia('(prefers-color-scheme: dark)')
		.addEventListener(
			'change',
			() => void loadTheme().then((t) => applyTheme(t.theme, t.mode)),
		);
};
