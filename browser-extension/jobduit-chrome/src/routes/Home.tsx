import { Refresh04FreeIcons } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { fetchPostings } from '../api';
import Button from '../components/Button';
import { useApiConfig } from '../hooks/useApiConfig';

export default function Home() {
	const { config, loaded, isConfigured } = useApiConfig();
	const query = useQuery({
		queryKey: ['postings', config.apiUrl, config.apiKey],
		queryFn: () => fetchPostings(config),
		enabled: loaded && isConfigured,
	});

	if (loaded && !isConfigured) {
		return (
			<div className="p-6">
				<div className="flex h-9 items-center justify-between">
					<h2 className="text-lg font-semibold">Home</h2>
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
				<p className="mt-2 text-sm text-ink-subtle">
					Configure the API to see your posting overview.
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
	const analyzedCount = postings.filter((posting) => posting.analyzedAt).length;
	const openCount = postings.filter((posting) => posting.status === 'OPEN').length;
	const recentPostings = [...postings]
		.sort(
			(a, b) =>
				new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
		)
		.slice(0, 3);

	return (
		<div className="p-4">
			<div className="flex h-9 items-center justify-between">
				<h2 className="text-lg font-semibold">Home</h2>
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
			<p className="mt-2 text-sm text-ink-subtle">Your posting overview.</p>

			{query.isLoading ?
				<div className="mt-4 grid grid-cols-3 gap-2">
					{[1, 2, 3].map((item) => (
						<div
							key={item}
							className="h-16 animate-pulse rounded-lg border border-border bg-surface"
						/>
					))}
				</div>
			:	query.isError ?
				<p className="mt-4 text-sm text-danger">{query.error.message}</p>
			:	<>
					<div className="mt-4 grid grid-cols-3 gap-2">
						{[
							['Postings', postings.length],
							['Analyzed', analyzedCount],
							['Open', openCount],
						].map(([label, count]) => (
							<div
								key={label}
								className="rounded-lg border border-border bg-surface p-3">
								<div className="text-lg font-semibold">{count}</div>
								<div className="text-xs text-ink-subtle">{label}</div>
							</div>
						))}
					</div>

					<div className="mt-5 flex items-center justify-between">
						<h3 className="text-sm font-semibold">Recent postings</h3>
						<Link
							to="/postings"
							className="text-xs text-ink-subtle hover:text-ink">
							View all
						</Link>
					</div>

					{recentPostings.length > 0 ?
						<ul className="mt-2 space-y-2">
							{recentPostings.map((posting) => (
								<li
									key={posting.id}
									className="rounded-lg border border-border bg-surface p-3 transition-colors duration-150 hover:border-accent-3 hover:bg-surface-hover">
									<Link
										to="/postings/$postingId"
										params={{ postingId: posting.id }}
										className="block">
										<div className="text-sm font-medium">{posting.title}</div>
										<div className="mt-1 text-sm text-text-meta">
											{posting.company.name}
										</div>
									</Link>
								</li>
							))}
						</ul>
					:	<p className="mt-2 text-sm text-text-meta">No postings yet.</p>}

				</>
			}
		</div>
	);
}
