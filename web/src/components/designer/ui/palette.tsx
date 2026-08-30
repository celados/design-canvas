import {
	Frame,
	Image,
	LayoutGrid,
	Maximize,
	PanelsTopLeft,
	Scan,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDesignerPages } from '../context'
import { useDesignNavigate } from '../nav'

type PaletteItem = {
	key: string
	label: string
	hint: string
	icon: 'canvas' | 'view' | 'action'
	run: () => void
}

/** Subsequence match with a bonus for consecutive runs; 0 = no match. */
export function fuzzyScore(query: string, text: string): number {
	if (!query) return 1
	let score = 0
	let run = 0
	let qi = 0
	for (let ti = 0; ti < text.length && qi < query.length; ti++) {
		if (text[ti] === query[qi]) {
			run++
			score += 1 + run
			qi++
		} else {
			run = 0
		}
	}
	return qi === query.length ? score : 0
}

export function CommandPalette() {
	const canvases = useDesignerPages()
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [selected, setSelected] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const navigate = useDesignNavigate()

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setOpen((current) => !current)
			}
		}
		const onPaletteEvent = () => setOpen(true)
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('dc:palette', onPaletteEvent)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('dc:palette', onPaletteEvent)
		}
	}, [])

	useEffect(() => {
		if (open) {
			setQuery('')
			setSelected(0)
			requestAnimationFrame(() => inputRef.current?.focus())
		}
	}, [open])

	const items = useMemo<PaletteItem[]>(() => {
		const stage = (type: 'fit' | 'actual-size') =>
			window.dispatchEvent(new CustomEvent('dc:command', { detail: { type } }))
		const all: PaletteItem[] = [
			{
				key: 'action:gallery',
				label: 'Go to Gallery',
				hint: 'Page',
				icon: 'action',
				run: () => navigate('/_design'),
			},
			{
				key: 'action:wall',
				label: 'Go to Wall — every canvas on one stage',
				hint: 'Page',
				icon: 'action',
				run: () => navigate('/_design/wall'),
			},
			{
				key: 'action:fit',
				label: 'Zoom to fit',
				hint: 'Stage · ⌘0',
				icon: 'action',
				run: () => stage('fit'),
			},
			{
				key: 'action:actual',
				label: 'Actual size',
				hint: 'Stage · ⌘1',
				icon: 'action',
				run: () => stage('actual-size'),
			},
			{
				key: 'action:annotate',
				label: 'Toggle annotate mode',
				hint: 'Stage · C',
				icon: 'action',
				run: () => window.dispatchEvent(new CustomEvent('dc:annotate')),
			},
			{
				key: 'action:copy-annotations',
				label: 'Copy annotations as Markdown',
				hint: 'Stage',
				icon: 'action',
				run: () => window.dispatchEvent(new CustomEvent('dc:annotate-copy')),
			},
			...canvases.flatMap((canvas): PaletteItem[] => [
				{
					key: `canvas:${canvas.id}`,
					label: canvas.title,
					hint: canvas.group,
					icon: 'canvas',
					run: () => navigate(`/_design/c/${canvas.id}`),
				},
				...canvas.views.map((view) => ({
					key: `view:${canvas.id}:${view.id}`,
					label: `${canvas.title} · ${view.label}`,
					hint: `${canvas.group} · ${view.width}px`,
					icon: 'view' as const,
					run: () =>
						navigate(`/_design/c/${canvas.id}`, { search: { view: view.id } }),
				})),
			]),
		]
		const q = query.trim().toLowerCase()
		if (!q) return all
		return all
			.map((item) => ({
				item,
				score: fuzzyScore(q, `${item.label} ${item.hint}`.toLowerCase()),
			}))
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((entry) => entry.item)
	}, [query, navigate, canvases])

	const run = useCallback((item: PaletteItem | undefined) => {
		if (!item) return
		setOpen(false)
		item.run()
	}, [])

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setSelected((current) => Math.min(items.length - 1, current + 1))
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			setSelected((current) => Math.max(0, current - 1))
		} else if (event.key === 'Enter') {
			event.preventDefault()
			run(items[selected])
		} else if (event.key === 'Escape') {
			setOpen(false)
		}
	}

	if (!open) return null

	return (
		<div className="dc-palette-backdrop" onClick={() => setOpen(false)}>
			<div className="dc-palette" onClick={(event) => event.stopPropagation()}>
				<input
					ref={inputRef}
					value={query}
					placeholder="Jump to a canvas, view, or action…"
					onChange={(event) => {
						setQuery(event.target.value)
						setSelected(0)
					}}
					onKeyDown={onKeyDown}
				/>
				<div className="dc-palette-list dc-scroll">
					{items.slice(0, 14).map((item, index) => (
						<button
							key={item.key}
							type="button"
							className={`dc-palette-item ${index === selected ? 'dc-palette-item-active' : ''}`}
							onMouseEnter={() => setSelected(index)}
							onClick={() => run(item)}
						>
							<span className="text-neutral-500">
								{item.icon === 'canvas' ? (
									<Image size={14} />
								) : item.icon === 'view' ? (
									<Frame size={14} />
								) : item.label.includes('fit') ? (
									<Maximize size={14} />
								) : item.label.includes('Actual') ? (
									<Scan size={14} />
								) : item.label.includes('Wall') ? (
									<PanelsTopLeft size={14} />
								) : (
									<LayoutGrid size={14} />
								)}
							</span>
							<span className="min-w-0 flex-1 truncate text-left">
								{item.label}
							</span>
							<span className="shrink-0 text-[11px] text-neutral-500">
								{item.hint}
							</span>
						</button>
					))}
					{items.length === 0 ? (
						<div className="px-4 py-8 text-center text-sm text-neutral-500">
							No matches
						</div>
					) : null}
				</div>
				<div className="dc-palette-footer">
					<span>↑↓ navigate</span>
					<span>↵ open</span>
					<span>esc close</span>
				</div>
			</div>
		</div>
	)
}
