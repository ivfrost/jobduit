import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'danger' | 'ghost' | 'unstyled';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		'bg-accent-4 font-medium text-background hover:bg-accent-5',
	danger:
		'border border-danger font-medium text-danger hover:bg-danger-bg',
	ghost: 'text-ink-subtle hover:bg-button',
	unstyled: '',
};

export default function Button({
	variant = 'primary',
	className = '',
	...props
}: ButtonProps) {
	return (
		<button
			type="button"
			{...props}
			className={`cursor-pointer rounded px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
		/>
	);
}
