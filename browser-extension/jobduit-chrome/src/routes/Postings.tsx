import { Refresh04FreeIcons } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { fetchPostings } from '../api';
import Button from '../components/Button';
import { useApiConfig } from '../hooks/useApiConfig';

export default function Postings() {
	const { config, loaded, isConfigured } = useApiConfig();

	const query = useQuery({
		queryKey: ['postings', config.apiUrl, config.apiKey],
		queryFn: () => fetchPostings(config),
		enabled: loaded && isConfigured,
	});

	if (loaded && !isConfigured) {
		return (
			<div className="p-4">
				<div className="flex h-9 items-center">
					<h2 className="text-lg font-semibold">Postings</h2>
				</div>
				<p className="mt-2 text-sm text-ink-subtle">
					The API is not configured yet. Add your server URL and API key to
					start capturing postings.
				</p>
				<Link
					to="/settings"
					className="mt-3 inline-block rounded bg-accent-4 px-4 py-2 text-sm font-medium text-background hover:bg-accent-5">
					Open settings
				</Link>
			</div>
		);
	}

	const postings = query.data ?? [];

	const loadingSkeleton = (
		<div className="mt-4 space-y-2">
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="h-16 animate-pulse rounded-lg border border-surface-border bg-surface"></div>
			))}
		</div>
	);

	return (
		<div className="p-4">
			<div className="flex h-9 items-center justify-between">
				<h2 className="text-lg font-semibold">Postings</h2>
				<Button
					onClick={() => query.refetch()}
					disabled={query.isFetching}
					variant="ghost"
					className="flex items-center gap-1.5 border border-border px-3 py-1.75">
					<HugeiconsIcon
						icon={Refresh04FreeIcons}
						size={16}
						strokeWidth={2}
						className={query.isFetching ? 'animate-spin' : ''}
					/>
					{query.isFetching ? 'Refreshing…' : 'Refresh'}
				</Button>
			</div>

			{query.isError && (
				<p className="mt-4 text-sm text-danger">{query.error?.message}</p>
			)}

			{query.isLoading && loadingSkeleton}

			{!query.isLoading && !query.isError && postings.length === 0 && (
				<p className="mt-4 text-sm text-text-meta">No postings yet.</p>
			)}

			{postings.length > 0 && (
				<ul className="mt-4 space-y-2">
					{postings.map((posting) => (
						<li
							key={posting.id}
							className="block cursor-pointer rounded-lg border border-border bg-surface p-3 transition-colors duration-150 hover:border-accent-3 hover:bg-surface-hover">
							<Link
								to="/postings/$postingId"
								params={{ postingId: posting.id }}
								className="block">
								<div className="text-sm font-medium">{posting.title}</div>
								<div className="mt-1 flex items-center gap-2 text-sm text-text-meta">
									<span>{posting.company.name}</span>
									{posting.workMode && (
										<span className="rounded border border-tag-border bg-tag-bg px-1.5 py-0.5 text-xs text-tag-ink">
											{posting.workMode}
										</span>
									)}
									{posting.status && (
										<span className="rounded border border-tag-border bg-tag-bg px-1.5 py-0.5 text-xs text-tag-ink">
											{posting.status}
										</span>
									)}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
