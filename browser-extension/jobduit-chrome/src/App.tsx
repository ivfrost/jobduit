import {
	AppWindowIcon,
	Briefcase01Icon,
	Home01Icon,
	JobLinkIcon,
	Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import Button from './components/Button';
import { FooterSlotContext } from './components/FooterSlot';

const isPopout =
	new URL(window.location.href).searchParams.get('popout') === '1';

const popOut = () => {
	void chrome.windows.create({
		url: chrome.runtime.getURL('index.html?popout=1'),
		type: 'popup',
		width: 520,
		height: 720,
	});
	window.close();
};

const TABS = [
	{ to: '/', label: 'Home', icon: Home01Icon },
	{ to: '/postings', label: 'Postings', icon: Briefcase01Icon },
	{ to: '/settings', label: 'Settings', icon: Settings01Icon },
] as const;

export default function App() {
	const location = useLocation();
	const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);

	useEffect(() => {
		void chrome.storage.session.set({ lastRoute: location.pathname });
	}, [location.pathname]);

	const isSubmenu =
		location.pathname.startsWith('/settings/') ||
		location.pathname.startsWith('/postings/');

	return (
		<FooterSlotContext.Provider value={footerSlot}>
			<div
				className={`flex flex-col overflow-hidden bg-background text-ink ${
					isPopout ? 'h-screen w-screen' : 'h-150 w-100'
				}`}>
				<header className="flex shrink-0 items-center justify-between border-b border-border bg-background-alt px-4 py-3">
					<h1 className="flex items-center gap-1.5 text-base font-bold">
						<HugeiconsIcon icon={JobLinkIcon} size={18} strokeWidth={2} />
						Jobduit
					</h1>
					{!isPopout && (
						<Button
							onClick={popOut}
							variant="ghost"
							aria-label="Open Jobduit in a popout window"
							className="flex items-center gap-1.5 border border-border px-2 py-1 text-xs">
							<HugeiconsIcon icon={AppWindowIcon} size={14} strokeWidth={2} />
							Pop out
						</Button>
					)}
				</header>

				<main className="min-h-0 flex-1 overflow-y-auto">
					<Outlet />
				</main>

				<div ref={setFooterSlot} className="shrink-0 empty:hidden" />

				{!isSubmenu && (
					<nav className="flex shrink-0 border-t border-border bg-background-alt p-1 gap-1">
						{TABS.map((tab) => {
							const active = location.pathname === tab.to;
							return (
								<Link
									key={tab.to}
									to={tab.to}
									aria-current={active ? 'page' : undefined}
									className={`flex flex-1 flex-col items-center gap-0.5 rounded py-2 text-xs transition-colors duration-200 hover:bg-accent-3/20 ${
										active ?
										'bg-accent-3/20 text-accent-5 font-bold ring-1 ring-inset ring-accent-3/50'
									:	'text-ink-subtle-lite'
									}`}>
									<span className="text-lg leading-none">
										<HugeiconsIcon icon={tab.icon} size={20} strokeWidth={2} />
									</span>
									<span className="font-semibold">{tab.label}</span>
								</Link>
							);
						})}
					</nav>
				)}
			</div>
		</FooterSlotContext.Provider>
	);
}
