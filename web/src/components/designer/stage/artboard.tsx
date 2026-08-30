import { memo, useCallback, useEffect, useRef, useState } from 'react'

import type { PlacedArtboard } from './layout'

import { viewport } from '../api'
import { ArtboardErrorBoundary } from './artboard-error-boundary'
import { useStageZoom } from './stage'

const presetName = (width: number): string | null => {
	for (const [name, presetWidth] of Object.entries(viewport)) {
		if (presetWidth === width) return name
	}
	return null
}

export const Artboard = memo(function Artboard(props: {
	item: PlacedArtboard
	onMeasure: (key: string, height: number) => void
}) {
	const { item } = props
	const zoom = useStageZoom()
	const frameRef = useRef<HTMLDivElement>(null)
	const [surface, setSurface] = useState<'light' | 'dark'>(
		item.view.dark ? 'dark' : 'light',
	)
	const [copied, setCopied] = useState(false)
	const [height, setHeight] = useState<number | null>(null)

	useEffect(() => {
		const frame = frameRef.current
		if (!frame) return
		const observer = new ResizeObserver(() => {
			const next = Math.round(frame.offsetHeight)
			setHeight((current) => (current === next ? current : next))
			props.onMeasure(item.key, next)
		})
		observer.observe(frame)
		return () => observer.disconnect()
	}, [item.key, props.onMeasure])

	const copyPng = useCallback(async () => {
		const frame = frameRef.current
		if (!frame) return
		const { toPng } = await import('html-to-image')
		const dataUrl = await toPng(frame, {
			pixelRatio: 2,
			backgroundColor: surface === 'dark' ? '#09090b' : '#ffffff',
			cacheBust: true,
		})
		try {
			const blob = await (await fetch(dataUrl)).blob()
			await navigator.clipboard.write([
				new ClipboardItem({ 'image/png': blob }),
			])
			setCopied(true)
		} catch {
			// Clipboard permission denied (e.g. unfocused window): fall back to a file.
			const anchor = document.createElement('a')
			anchor.href = dataUrl
			anchor.download = `${item.canvas.id}-${item.view.id}.png`
			anchor.click()
		}
		setTimeout(() => setCopied(false), 1600)
	}, [item.canvas.id, item.view.id, surface])

	const preset = presetName(item.width)
	// Below fit-all zoom levels the chip row is noise; keep only the name.
	const compact = zoom < 0.35
	const title = item.labelPrefix
		? `${item.labelPrefix} · ${item.view.label}`
		: item.view.label

	return (
		<div
			className="absolute"
			style={{ left: item.x, top: item.y }}
			data-artboard
		>
			{/*
			 * Counter-scaled so the label reads at a constant screen size at any
			 * zoom. The clamp mirrors the wall labels: beyond 8x the wall's reserved
			 * label band would overflow into the previous row.
			 */}
			<div
				className="dc-artboard-label"
				style={{
					transform: `scale(${Math.min(1 / zoom, 8)})`,
					transformOrigin: 'bottom left',
					width: item.width * zoom,
				}}
			>
				<div className="min-w-0 truncate">
					<span className="font-semibold text-neutral-100">{title}</span>
					{compact ? null : (
						<span className="ml-2 text-neutral-500">
							{item.canvas.group} / {item.canvas.title}
						</span>
					)}
				</div>
				{compact ? null : (
					<div className="flex shrink-0 items-center gap-1.5">
						{preset ? <span className="dc-chip">{preset}</span> : null}
						<span className="dc-chip tabular-nums">
							{item.width}×{height ?? '…'}
						</span>
						<button
							type="button"
							className="dc-label-button"
							title={surface === 'dark' ? 'Light surface' : 'Dark surface'}
							onClick={() =>
								setSurface((current) => (current === 'dark' ? 'light' : 'dark'))
							}
						>
							{surface === 'dark' ? 'Light' : 'Dark'}
						</button>
						<button
							type="button"
							className="dc-label-button"
							title="Copy PNG"
							onClick={copyPng}
						>
							{copied ? 'Copied' : 'PNG'}
						</button>
					</div>
				)}
			</div>
			<div
				ref={frameRef}
				className="dc-frame"
				data-dc-frame={item.key}
				style={{
					width: item.width,
					minHeight: item.view.minHeight ?? 480,
					backgroundColor: surface === 'dark' ? '#09090b' : '#ffffff',
					color: surface === 'dark' ? '#fafafa' : '#09090b',
				}}
			>
				<ArtboardErrorBoundary label={title}>
					{item.view.render()}
				</ArtboardErrorBoundary>
			</div>
		</div>
	)
})
