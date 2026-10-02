import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useId, useState } from 'react';
import Button from './Button';

export interface InputProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'value'
> {
	value: string;
	label: string;
	errors?: string[];
}

export default function Input({
	label,
	value,
	type = 'text',
	id,
	className = '',
	errors,
	...props
}: InputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const errorId = `${inputId}-errors`;
	const [showValue, setShowValue] = useState(false);
	const isPassword = type === 'password';
	const hasErrors = !!errors?.length;

	return (
		<div>
			<label htmlFor={inputId} className="block text-sm font-medium">
				{label}
			</label>
			<div
				className={`mt-1 flex w-full items-center rounded-lg border bg-input focus-within:ring-1 ${
					hasErrors ?
						'border-danger focus-within:border-danger focus-within:ring-danger'
					:	'border-border focus-within:border-accent-4 focus-within:ring-accent-4'
				}`}>
				<input
					{...props}
					id={inputId}
					type={isPassword && showValue ? 'text' : type}
					value={value}
					aria-invalid={hasErrors || undefined}
					aria-describedby={hasErrors ? errorId : undefined}
					className={`w-full pl-3 pr-2 bg-transparent py-2 text-sm outline-none placeholder:text-text-meta-lite disabled:opacity-50 ${className}`}
				/>
				{isPassword && (
					<Button
						aria-label={showValue ? 'Hide value' : 'Show value'}
						aria-pressed={showValue}
						onClick={() => setShowValue((v) => !v)}
						variant="ghost"
						className="mr-1 flex !h-8 !w-8 shrink-0 aspect-square items-center justify-center rounded-lg !p-0 text-ink hover:bg-surface-hover hover:text-ink">
						<HugeiconsIcon
							icon={showValue ? ViewOffIcon : ViewIcon}
							size={20}
							strokeWidth={2}
							className="block shrink-0"
						/>
					</Button>
				)}
			</div>
			{hasErrors && (
				<ul id={errorId} className="mt-1 space-y-0.5 text-xs text-danger">
					{errors!.map((message, index) => (
						<li key={index}>{message}</li>
					))}
				</ul>
			)}
		</div>
	);
}
