import { Link } from '@tanstack/react-router';

const ITEMS = [
	{
		to: '/settings/api',
		label: 'API configuration',
		description: 'Server URL and API key',
	},
	{
		to: '/settings/theme',
		label: 'Theme',
		description: 'Customize the look and feel',
	},
] as const;

export default function Settings() {
	return (
		<div className="p-4">
			<div className="flex h-9 items-center">
				<h2 className="text-lg font-semibold">Settings</h2>
			</div>

			<ul className="mt-4 space-y-2">
				{ITEMS.map((item) => (
					<li key={item.to}>
						<Link
							to={item.to}
							className="block rounded-lg border border-border bg-surface p-3 transition-colors duration-150 hover:border-accent-3 hover:bg-surface-hover">
							<div className="text-sm font-medium text-accent-1">{item.label}</div>
							<div className="text-sm text-ink-subtle">{item.description}</div>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
