import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Camera } from '../stage/camera'

import { useDesignerPage, useDesignerPages } from '../context'
import {
	DesignLink,
	useCanvasIdParam,
	useDesignNavigate,
	useDesignSearch,
} from '../nav'
import { artboardKey, layoutViews } from '../stage/layout'
import { Stage } from '../stage/stage'
import { DeviceSwitcher } from './device-switcher'

function readCamera(search: Record<string, unknown>): Camera | undefined {
	const { x, y, z } = search
	if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
		return { x, y, zoom: z }
	}
	return undefined
}

export function CanvasPage() {
	const canvases = useDesignerPages()
	const canvasId = useCanvasIdParam()
	const canvas = useDesignerPage(canvasId)
	const search = useDesignSearch()
	const navigate = useDesignNavigate()

	const [measured, setMeasured] = useState<ReadonlyMap<string, number>>(
		() => new Map(),
	)
	const [measuredFor, setMeasuredFor] = useState(canvasId)
	if (measuredFor !== canvasId) {
		setMeasuredFor(canvasId)
		setMeasured(new Map())
	}
	const onMeasure = useCallback((key: string, height: number) => {
		setMeasured((current) => {
			const previous = current.get(key)
			if (previous !== undefined && Math.abs(previous - height) <= 1)
				return current
			const next = new Map(current)
			next.set(key, height)
			return next
		})
	}, [])

	const items = useMemo(() => (canvas ? layoutViews(canvas) : []), [canvas])

	// Camera deep link: written back debounced so a copied URL reproduces the
	// exact framing for review. The focused view rides along — dropping it
	// here would let any camera motion erase a device-pill selection.
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	)
	const onViewRef = useRef(search.view)
	onViewRef.current = typeof search.view === 'string' ? search.view : undefined
	const onCameraMove = useCallback(
		(camera: Camera) => {
			if (!canvasId) return
			clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				navigate(`/_design/c/${canvasId}`, {
					search: {
						x: Math.round(camera.x),
						y: Math.round(camera.y),
						z: Math.round(camera.zoom * 1000) / 1000,
						...(onViewRef.current ? { view: onViewRef.current } : {}),
					},
					replace: true,
				})
			}, 400)
		},
		[canvasId, navigate],
	)
	useEffect(() => () => clearTimeout(debounceRef.current), [])

	const focusKey =
		canvas && typeof search.view === 'string'
			? canvas.views.some((view) => view.id === search.view)
				? artboardKey(canvas.id, search.view)
				: undefined
			: undefined

	// Device pills reuse the `?view=` deep link; clearing it refits the stage.
	const onSelectView = useCallback(
		(viewId: string | undefined) => {
			if (!canvasId) return
			navigate(`/_design/c/${canvasId}`, {
				search: viewId ? { view: viewId } : {},
				replace: true,
			})
		},
		[canvasId, navigate],
	)

	// [ / ] step through canvases in registry order.
	useEffect(() => {
		if (!canvas) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return
			const target = event.target
			if (
				target instanceof HTMLElement &&
				(target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target.isContentEditable)
			) {
				return
			}
			if (event.key !== '[' && event.key !== ']') return
			const index = canvases.findIndex((entry) => entry.id === canvas.id)
			const delta = event.key === ']' ? 1 : -1
			const next = canvases[(index + delta + canvases.length) % canvases.length]
			if (next) navigate(`/_design/c/${next.id}`)
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [canvas, navigate])

	if (!canvas) {
		return (
			<div className="grid h-full place-items-center">
				<div className="flex flex-col items-center gap-3 text-center">
					<p className="text-sm text-neutral-400">
						No canvas named{' '}
						<code className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-xs">
							{canvasId}
						</code>
					</p>
					<DesignLink to="/_design" className="dc-button">
						Back to gallery
					</DesignLink>
				</div>
			</div>
		)
	}

	return (
		<div className="dc-canvas-page">
			<Stage
				items={items}
				measured={measured}
				onMeasure={onMeasure}
				initialCamera={readCamera(search)}
				focusKey={focusKey}
				fitKey={canvas.id}
				onCameraMove={onCameraMove}
				canvas={canvas}
			/>
			<DeviceSwitcher
				canvas={canvas}
				activeViewId={
					typeof search.view === 'string' &&
					canvas.views.some((view) => view.id === search.view)
						? search.view
						: undefined
				}
				onSelect={onSelectView}
			/>
		</div>
	)
}
