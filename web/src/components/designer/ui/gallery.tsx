import { PanelsTopLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasDefinition } from '../api'

import { useDesignerPages } from '../context'
import { DesignLink } from '../nav'

export function GalleryPage() {
	const canvases = useDesignerPages()
	const [query, setQuery] = useState('')
	const [group, setGroup] = useState<string | null>(null)
	const canvasGroups = useMemo(
		() => [...new Set(canvases.map((canvas) => canvas.group))],
		[canvases],
	)

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		return canvases.filter((canvas) => {
			if (group && canvas.group !== group) return false
			if (!q) return true
			return [
				canvas.title,
				canvas.group,
				canvas.summary ?? '',
				...(canvas.tags ?? []),
			]
				.join(' ')
				.toLowerCase()
				.includes(q)
		})
	}, [query, group, canvases])

	return (
		<div className="dc-gallery dc-scroll">
			<header className="dc-gallery-header">
				<div className="flex items-baseline gap-3">
					<h1 className="text-lg font-semibold tracking-tight text-neutral-100">
						Design Canvas
					</h1>
					<span className="text-sm text-neutral-500">
						{canvases.length} canvases ·{' '}
						{canvases.reduce((sum, canvas) => sum + canvas.views.length, 0)}{' '}
						views
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="dc-nav-search w-56">
						<Search size={13} className="shrink-0 text-neutral-500" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search canvases"
						/>
					</div>
					<DesignLink to="/_design/wall" className="dc-button">
						<PanelsTopLeft size={14} /> Wall
					</DesignLink>
				</div>
			</header>

			<div className="flex flex-wrap gap-1.5">
				<button
					type="button"
					className={`dc-chip-button ${group === null ? 'dc-chip-button-active' : ''}`}
					onClick={() => setGroup(null)}
				>
					All
				</button>
				{canvasGroups.map((name) => (
					<button
						key={name}
						type="button"
						className={`dc-chip-button ${group === name ? 'dc-chip-button-active' : ''}`}
						onClick={() => setGroup(name)}
					>
						{name}
					</button>
				))}
			</div>

			{filtered.length === 0 ? (
				<EmptyState hasCanvases={canvases.length > 0} />
			) : (
				<div className="dc-gallery-grid">
					{filtered.map((canvas) => (
						<CanvasCard key={canvas.id} canvas={canvas} />
					))}
				</div>
			)}
		</div>
	)
}

function CanvasCard(props: { canvas: CanvasDefinition }) {
	const { canvas } = props
	const firstView = canvas.views[0]
	const frameRef = useRef<HTMLDivElement>(null)
	const [scale, setScale] = useState(0)
	// Mount the preview only when near the viewport: every card renders a real
	// component tree, so offscreen cards stay cheap.
	const [inView, setInView] = useState(false)

	useEffect(() => {
		const frame = frameRef.current
		if (!frame) return
		const observer = new ResizeObserver(() => {
			setScale(frame.clientWidth / (firstView?.width ?? 1440))
		})
		observer.observe(frame)
		const visibility = new IntersectionObserver(
			(entries) => setInView(entries.some((entry) => entry.isIntersecting)),
			{ rootMargin: '400px' },
		)
		visibility.observe(frame)
		return () => {
			observer.disconnect()
			visibility.disconnect()
		}
	}, [firstView?.width])

	return (
		<DesignLink to={`/_design/c/${canvas.id}`} className="dc-card">
			<div ref={frameRef} className="dc-card-preview">
				{inView && firstView && scale > 0 ? (
					<div
						className="pointer-events-none absolute top-0 left-0 origin-top-left"
						style={{ width: firstView.width, transform: `scale(${scale})` }}
					>
						<div
							className="overflow-hidden"
							style={{
								maxHeight:
									(frameRef.current?.clientHeight ?? 0) /
									Math.max(scale, 0.001),
								backgroundColor: firstView.dark ? '#09090b' : '#ffffff',
								color: firstView.dark ? '#fafafa' : '#09090b',
							}}
						>
							{firstView.render()}
						</div>
					</div>
				) : null}
			</div>
			<div className="flex items-start justify-between gap-3 px-4 py-3">
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold text-neutral-100">
						{canvas.title}
					</div>
					<div className="mt-0.5 truncate text-xs text-neutral-500">
						{canvas.summary ?? canvas.group}
					</div>
				</div>
				<span className="dc-chip shrink-0">{canvas.views.length} views</span>
			</div>
		</DesignLink>
	)
}

function EmptyState(props: { hasCanvases: boolean }) {
	if (props.hasCanvases) {
		return (
			<div className="rounded-xl border border-dashed border-neutral-800 px-6 py-16 text-center text-sm text-neutral-500">
				No canvases match this filter.
			</div>
		)
	}
	return (
		<div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-neutral-800 px-6 py-12">
			<p className="text-sm text-neutral-400">
				No pages registered. Add a file under{' '}
				<code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-xs text-neutral-200">
					src/design/
				</code>{' '}
				and pass it into{' '}
				<code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-xs text-neutral-200">
					pages
				</code>
				:
			</p>
			<pre className="w-full overflow-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs leading-6 text-neutral-300">
				{`// src/routes/[_]design.tsx
import { Designer } from '@/components/designer'
import Page1 from '@/design/page1'

<Designer pages={[{ name: 'page1', component: <Page1 /> }]} />`}
			</pre>
		</div>
	)
}
