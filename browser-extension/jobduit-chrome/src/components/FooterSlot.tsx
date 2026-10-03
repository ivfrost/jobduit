import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

export const FooterSlotContext = createContext<HTMLElement | null>(null);

export function FooterPortal({ children }: { children: ReactNode }) {
	const slot = useContext(FooterSlotContext);
	return slot ? createPortal(children, slot) : null;
}

export function ActionBar({
	formId,
	onDiscard,
	disabled,
	saving,
	status,
}: {
	formId: string;
	onDiscard: () => void;
	disabled?: boolean;
	saving?: boolean;
	status?: ReactNode;
}) {
	return (
		<FooterPortal>
			<div className="flex justify-end gap-4 border-t border-border bg-background-alt p-3 items-center">
				<span className="min-w-0 truncate text-sm text-success">{status}</span>
				<div className="flex gap-2">
					<Button
						type="button"
						onClick={onDiscard}
						disabled={disabled}
						variant="ghost">
						Discard
					</Button>
					<Button type="submit" form={formId} disabled={disabled}>
						{saving ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</div>
		</FooterPortal>
	);
}
