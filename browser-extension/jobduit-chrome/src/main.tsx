import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ApiSettings from './routes/ApiSettings.tsx';
import Home from './routes/Home.tsx';
import Postings from './routes/Postings.tsx';
import Posting from './routes/Posting.tsx';
import Settings from './routes/Settings.tsx';
import ThemeSettings from './routes/ThemeSettings.tsx';
import { initTheme } from './lib/theme';

const rootRoute = createRootRoute({ component: App });

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: Home,
});

const postingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/postings',
	component: Postings,
});

const postingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/postings/$postingId',
	component: Posting,
});

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/settings',
	component: Settings,
});

const apiSettingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/settings/api',
	component: ApiSettings,
});

const themeSettingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/settings/theme',
	component: ThemeSettings,
});

const routeTree = rootRoute.addChildren([
	homeRoute,
	postingsRoute,
	postingRoute,
	settingsRoute,
	apiSettingsRoute,
	themeSettingsRoute,
]);
const initialPath =
	window.location.pathname === '/index.html' ? '/' : window.location.pathname;
const router = createRouter({
	history: createMemoryHistory({ initialEntries: [initialPath] }),
	routeTree,
});

// Restore stable list/settings routes; detail pages can become stale after deletion.
void chrome.storage.session.get('lastRoute').then(({ lastRoute }) => {
	const restorableRoutes = new Set([
		'/postings',
		'/settings',
		'/settings/api',
		'/settings/theme',
	]);
	if (typeof lastRoute === 'string' && restorableRoutes.has(lastRoute)) {
		router.history.push(lastRoute);
	}
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

const queryClient = new QueryClient();

void initTheme().then(() => {
	createRoot(document.getElementById('root')!).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</StrictMode>,
	);
});
