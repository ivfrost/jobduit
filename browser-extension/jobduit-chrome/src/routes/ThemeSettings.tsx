import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import {
	applyTheme,
	DEFAULT_MODE,
	DEFAULT_THEME,
	loadTheme,
	saveTheme,
	THEMES,
	type Mode,
	type Theme,
} from '../lib/theme';

const MODES: { id: Mode; label: string }[] = [
	{ id: 'light', label: 'Light' },
	{ id: 'dark', label: 'Dark' },
	{ id: 'system', label: 'System' },
];

export default function ThemeSettings() {
	const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
	const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		void loadTheme().then((t) => {
			setTheme(t.theme);
			setMode(t.mode);
			setLoaded(true);
		});
	}, []);

	const update = (nextTheme: Theme, nextMode: Mode) => {
		setTheme(nextTheme);
		setMode(nextMode);
		applyTheme(nextTheme, nextMode);
		void saveTheme(nextTheme, nextMode);
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
				<h2 className="text-lg font-semibold">Theme</h2>
			</div>

			<section className="mt-4">
				<h3 className="text-sm font-medium">Mode</h3>
				<div
					role="radiogroup"
					className="mt-2 flex rounded border border-border bg-background-alt p-1">
					{MODES.map((m) => (
						<Button
							key={m.id}
							variant="unstyled"
							role="radio"
							aria-checked={mode === m.id}
							disabled={!loaded}
							onClick={() => update(theme, m.id)}
							className={`flex-1 rounded px-3 py-1.5 text-sm ${
								mode === m.id ?
									'bg-accent-4 font-medium text-background'
								:	'text-ink-subtle hover:bg-button'
							}`}>
							{m.label}
						</Button>
					))}
				</div>
			</section>

			<section className="mt-6">
				<h3 className="text-sm font-medium">Color</h3>
				<div role="radiogroup" className="mt-2 grid grid-cols-2 gap-3">
					{THEMES.map((t) => {
						const selected = theme === t.id;
						return (
							<Button
								key={t.id}
								variant="unstyled"
								role="radio"
								aria-checked={selected}
								disabled={!loaded}
								onClick={() => update(t.id, mode)}
								className={`rounded border p-3 text-left hover:bg-button ${
									selected ?
										'border-accent-4 ring-2 ring-accent-4'
									:	'border-border'
								}`}>
								<div className="flex overflow-hidden rounded">
									{t.swatch.map((c) => (
										<span
											key={c}
											className="h-6 flex-1"
											style={{ backgroundColor: c }}
										/>
									))}
								</div>
								<span
									className={`mt-2 block text-sm ${selected ? 'font-semibold' : 'text-ink-subtle'}`}>
									{t.label}
								</span>
							</Button>
						);
					})}
				</div>
			</section>
		</div>
	);
}
