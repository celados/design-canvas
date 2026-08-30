import { useEffect, useState } from 'react'

const SHORTCUTS: readonly { keys: string; action: string }[] = [
	{ keys: '⌘K', action: 'Command palette' },
	{ keys: '[ / ]', action: 'Previous / next canvas' },
	{ keys: 'Space + drag', action: 'Pan the stage' },
	{ keys: '⌘-scroll / pinch', action: 'Zoom at cursor' },
	{ keys: '⌘0', action: 'Zoom to fit' },
	{ keys: '⌘1', action: 'Actual size (100%)' },
	{ keys: 'C', action: 'Toggle annotate mode' },
	{ keys: '?', action: 'Toggle this help' },
]

/**
 * Keyboard cheatsheet, toggled with `?`. Shortcuts live in several modules
 * (stage, canvas-page, palette, annotator); this table is documentation, so a
 * new binding needs a manual row here.
 */
export function ShortcutsOverlay() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target
			if (
				target instanceof HTMLElement &&
				(target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target.isContentEditable)
			) {
				return
			}
			if (event.key === '?') {
				event.preventDefault()
				setOpen((current) => !current)
			} else if (event.key === 'Escape') {
				setOpen(false)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	if (!open) return null

	return (
		<div
			className="dc-shortcuts-backdrop"
			onClick={() => setOpen(false)}
			onKeyDown={() => {}}
			role="presentation"
		>
			<aside
				className="dc-shortcuts"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={() => {}}
				role="dialog"
				aria-label="Keyboard shortcuts"
			>
				<div className="flex items-center justify-between px-1">
					<span className="text-xs font-bold tracking-wide text-neutral-400 uppercase">
						Keyboard shortcuts
					</span>
					<button
						type="button"
						className="dc-icon-button"
						title="Close"
						onClick={() => setOpen(false)}
					>
						×
					</button>
				</div>
				<div className="mt-2 flex flex-col gap-1">
					{SHORTCUTS.map((shortcut) => (
						<div key={shortcut.keys} className="dc-shortcut-row">
							<kbd className="dc-kbd">{shortcut.keys}</kbd>
							<span className="text-xs text-neutral-300">
								{shortcut.action}
							</span>
						</div>
					))}
				</div>
			</aside>
		</div>
	)
}
