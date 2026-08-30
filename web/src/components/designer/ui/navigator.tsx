import { ChevronDown, LayoutGrid, PanelsTopLeft, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useDesignerPages } from '../context'
import { DesignLink, useDesignPathname } from '../nav'

export function Navigator(props: {
	open: boolean
	onToggle: (open: boolean) => void
}) {
	const { open, onToggle } = props
	const canvases = useDesignerPages()
	const canvasGroups = useMemo(
		() => [...new Set(canvases.map((canvas) => canvas.group))],
		[canvases],
	)
	const pathname = useDesignPathname()
	const onGallery = pathname === '/_design' || pathname === '/_design/'
	const [query, setQuery] = useState('')
	const [closedGroups, setClosedGroups] = useState<ReadonlySet<string>>(
		new Set(),
	)

	const activeCanvasId = pathname.startsWith('/_design/c/')
		? pathname.slice('/_design/c/'.length)
		: null

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return canvases
		return canvases.filter((canvas) =>
			[canvas.title, canvas.group, canvas.summary ?? '', ...(canvas.tags ?? [])]
				.join(' ')
				.toLowerCase()
				.includes(q),
		)
	}, [query, canvases])

	if (!open) {
		return (
			<button
				type="button"
				className="dc-nav-fab"
				title="Canvas navigator"
				onClick={() => onToggle(true)}
			>
				<PanelsTopLeft size={15} />
				<span>Design</span>
			</button>
		)
	}

	return (
		<aside className="dc-nav dc-scroll">
			<div className="flex items-center justify-between gap-2 px-1">
				<DesignLink to="/_design" className="dc-nav-brand">
					<span className="dc-brand-mark">◈</span> Design Canvas
				</DesignLink>
				<button
					type="button"
					className="dc-icon-button"
					title="Close navigator"
					onClick={() => onToggle(false)}
				>
					<X size={14} />
				</button>
			</div>

			<div className="dc-nav-search">
				<Search size={13} className="shrink-0 text-neutral-500" />
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Filter canvases"
				/>
			</div>

			<div className="flex gap-1 px-1">
				<DesignLink
					to="/_design"
					className={`dc-nav-pill ${onGallery ? 'dc-nav-pill-active' : ''}`}
				>
					<LayoutGrid size={13} /> Gallery
				</DesignLink>
				<DesignLink
					to="/_design/wall"
					className={`dc-nav-pill ${pathname === '/_design/wall' ? 'dc-nav-pill-active' : ''}`}
				>
					<PanelsTopLeft size={13} /> Wall
				</DesignLink>
			</div>

			<nav className="flex flex-col gap-3">
				{canvasGroups.map((group) => {
					const entries = filtered.filter((canvas) => canvas.group === group)
					if (entries.length === 0) return null
					const closed = closedGroups.has(group)
					return (
						<div key={group}>
							<button
								type="button"
								className="dc-nav-group"
								onClick={() =>
									setClosedGroups((current) => {
										const next = new Set(current)
										if (next.has(group)) next.delete(group)
										else next.add(group)
										return next
									})
								}
							>
								<ChevronDown
									size={12}
									className={`transition-transform ${closed ? '-rotate-90' : ''}`}
								/>
								{group}
								<span className="ml-auto text-neutral-600">
									{entries.length}
								</span>
							</button>
							{closed ? null : (
								<div className="mt-0.5 flex flex-col">
									{entries.map((canvas) => (
										<DesignLink
											key={canvas.id}
											to="/_design/c/$canvasId"
											params={{ canvasId: canvas.id }}
											search={{}}
											className={`dc-nav-item ${
												activeCanvasId === canvas.id ? 'dc-nav-item-active' : ''
											}`}
										>
											<span className="min-w-0 truncate">{canvas.title}</span>
											<span className="dc-nav-count">
												{canvas.views.length}
											</span>
										</DesignLink>
									))}
								</div>
							)}
						</div>
					)
				})}
			</nav>

			<div className="mt-auto px-1 pt-3 text-[11px] text-neutral-600">
				{canvases.length} canvases ·{' '}
				{canvases.reduce((sum, canvas) => sum + canvas.views.length, 0)} views
			</div>
		</aside>
	)
}
