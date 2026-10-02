import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { analyzePosting, deletePosting, fetchPosting } from '../api';
import Button from '../components/Button';
import { FooterPortal } from '../components/FooterSlot';
import { useApiConfig } from '../hooks/useApiConfig';

const formatDate = (value: string | null) =>
	value ? new Date(value).toLocaleDateString() : null;

export default function Posting() {
	const { postingId } = useParams({ from: '/postings/$postingId' });
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { config, loaded, isConfigured } = useApiConfig();
	const [descriptionOpen, setDescriptionOpen] = useState(false);

	const query = useQuery({
		queryKey: ['posting', postingId, config.apiUrl, config.apiKey],
		queryFn: () => fetchPosting(config, postingId),
		enabled: loaded && isConfigured,
	});
	const analyzeMutation = useMutation({
		mutationFn: () => analyzePosting(config, postingId),
		onSuccess: () => {
			void query.refetch();
		},
	});
	const deleteMutation = useMutation({
		mutationFn: () => deletePosting(config, postingId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['postings'] });
			await navigate({ to: '/postings' });
		},
	});

	const handleDelete = () => {
		if (
			window.confirm(
				'Delete this posting? This action cannot be undone.',
			)
		) {
			deleteMutation.mutate();
		}
	};

	const handleOpenOriginal = () => {
		void chrome.tabs.create({ url: posting.sourceUrl });
	};

	if (loaded && !isConfigured) {
		return (
			<div className="p-4">
				<Link
					to="/postings"
					className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
					<span className="font-semibold">←</span>
					<span>Back to postings</span>
				</Link>
				<div className="mt-4 flex h-9 items-center">
					<h2 className="text-lg font-semibold">Posting</h2>
				</div>
				<p className="mt-2 text-sm text-ink-subtle">
					Configure the API before viewing postings.
				</p>
			</div>
		);
	}

	if (query.isLoading) {
		return <div className="p-4 text-sm text-text-meta">Loading posting…</div>;
	}

	if (query.isError || !query.data) {
		return (
			<div className="p-4">
				<Link
					to="/postings"
					className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
					<span className="font-semibold">←</span>
					<span>Back to postings</span>
				</Link>
				<p className="mt-4 text-sm text-danger">
					{query.error?.message ?? 'Posting not found.'}
				</p>
			</div>
		);
	}

	const posting = query.data;
	const location = [posting.city, posting.country].filter(Boolean).join(', ');
	const salary =
		posting.salaryMin !== null || posting.salaryMax !== null ?
			`${posting.salaryMin ?? '—'} – ${posting.salaryMax ?? '—'} ${posting.salaryCurrency ?? ''}`.trim()
		:	null;

	return (
		<div className="p-4">
			<Link
				to="/postings"
				className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-ink">
				<span className="font-semibold">←</span>
				<span>Back to postings</span>
			</Link>
			<FooterPortal>
				<div className="flex items-center justify-end gap-4 border-t border-border bg-background-alt p-3">
					<div className="flex gap-2">
						<Button
							variant="danger"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
							className="px-3">
							{deleteMutation.isPending ? 'Deleting…' : 'Delete posting'}
						</Button>
						<Button
							onClick={() => analyzeMutation.mutate()}
							disabled={analyzeMutation.isPending}
							className="px-3">
							{analyzeMutation.isPending ?
								'Requesting analysis…'
							:	posting.analyzedAt ?
								'Analyze again'
							:	'Analyze posting'}
						</Button>
					</div>
				</div>
			</FooterPortal>
			{analyzeMutation.isError && (
				<p className="mt-2 text-sm text-danger">
					{analyzeMutation.error.message}
				</p>
			)}
			{deleteMutation.isError && (
				<p className="mt-2 text-sm text-danger">
					{deleteMutation.error.message}
				</p>
			)}

			<div className="mt-5 flex h-9 items-center">
				<h2 className="text-lg font-semibold">{posting.title}</h2>
			</div>
			<p className="mt-1 text-sm text-text-meta">{posting.company.name}</p>
			{posting.analyzedAt && (
				<p className="mt-2 text-xs text-success">
					Analyzed {formatDate(posting.analyzedAt)}
				</p>
			)}

			{posting.summary && (
				<section className="mt-4 rounded-lg border border-border bg-surface p-4">
					<h3 className="text-sm font-semibold">Summary</h3>
					<p className="mt-2 text-sm leading-5 text-ink-subtle">
						{posting.summary}
					</p>
				</section>
			)}

			<div className="mt-4 flex flex-wrap gap-2">
				{posting.status && (
					<span className="rounded border border-tag-border bg-tag-bg px-2 py-1 text-xs text-tag-ink">
						{posting.status}
					</span>
				)}
				{posting.workMode && (
					<span className="rounded border border-tag-border bg-tag-bg px-2 py-1 text-xs text-tag-ink">
						{posting.workMode}
					</span>
				)}
				{posting.tags.map((tag) => (
					<span
						key={tag.id}
						className="rounded border border-tag-border bg-tag-bg px-2 py-1 text-xs text-tag-ink">
						{tag.name}
					</span>
				))}
			</div>

			<dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt className="text-text-meta">Location</dt>
					<dd>{location || 'Unknown'}</dd>
				</div>
				{salary && (
					<div>
						<dt className="text-text-meta">Salary</dt>
						<dd>{salary}</dd>
					</div>
				)}
				{posting.minYearsExperience !== null && (
					<div>
						<dt className="text-text-meta">Experience</dt>
						<dd>{posting.minYearsExperience}+ years</dd>
					</div>
				)}
				<div>
					<dt className="text-text-meta">Posted</dt>
					<dd>{formatDate(posting.postedAt) ?? 'Unknown'}</dd>
				</div>
			</dl>

			<Button
				variant="ghost"
				onClick={handleOpenOriginal}
				className="mt-5 border border-border px-3">
				Open original posting
			</Button>

			{posting.bodyMarkdown && (
				<section className="mt-5">
					<Button
						variant="ghost"
						aria-expanded={descriptionOpen}
						onClick={() => setDescriptionOpen((open) => !open)}
						className="flex w-full items-center justify-between px-0 font-semibold">
						<span>
							{descriptionOpen ? 'Hide description' : 'Show description'}
						</span>
						<span aria-hidden="true">{descriptionOpen ? '⌃' : '⌄'}</span>
					</Button>
					{descriptionOpen && (
						<div className="markdown-body mt-2 text-sm leading-5 text-ink-subtle">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{posting.bodyMarkdown}
							</ReactMarkdown>
						</div>
					)}
				</section>
			)}
		</div>
	);
}