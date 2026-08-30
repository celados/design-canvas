import type { PointerEvent as ReactPointerEvent } from 'react'

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import type { CanvasDefinition } from '../api'
import type { Camera, Rect, Size } from './camera'
import type { PlacedItem } from './layout'

import { Annotator } from './annotate/annotator'
import { Artboard } from './artboard'
import { fitBounds, panBy, unionRects, zoomAtPoint } from './camera'
import { Hud } from './hud'
import { placedItemRect } from './layout'
import { Minimap } from './minimap'
import { ReferenceLayer } from './refs'

// Three contexts with distinct invalidation rates: zoom changes rarely drive
// artboard re-renders; api callbacks never change; camera changes every frame
// during pan and is consumed only by screen-space overlays (composer, pins
// fly-to), never by Artboard.
const StageZoomContext = createContext(1)
export const useStageZoom = () => useContext(StageZoomContext)

type StageApiValue = {
	screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
	viewportCenterWorld: () => { x: number; y: number }
	flyTo: (rect: Rect) => void
}
const StageApiContext = createContext<StageApiValue>({
	screenToWorld: () => ({ x: 0, y: 0 }),
	viewportCenterWorld: () => ({ x: 0, y: 0 }),
	flyTo: () => {},
})
export const useStageApi = () => useContext(StageApiContext)

const StageCameraContext = createContext<Camera>({ x: 0, y: 0, zoom: 1 })
export const useStageCamera = () => useContext(StageCameraContext)

const FIT_PADDING = 120

type StageProps = {
	items: PlacedItem[]
	measured: ReadonlyMap<string, number>
	onMeasure: (key: string, height: number) => void
	/** Deep-linked camera from the URL; when absent the stage fits on mount. */
	initialCamera?: Camera | undefined
	/** Artboard key to frame on mount when no camera is deep-linked. */
	focusKey?: string | undefined
	/** When this changes, refit the camera before paint. Same Stage instance. */
	fitKey?: string | undefined
	/** Called at most once per frame while the camera moves; persist debounced. */
	onCameraMove?: (camera: Camera) => void
	/** When set, the annotator (C) can pin comments on this canvas's artboards. */
	canvas?: CanvasDefinition | undefined
}

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target.isContentEditable)
	)
}

export function Stage(props: StageProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [camera, setCameraState] = useState<Camera>(
		() => props.initialCamera ?? { x: 0, y: 0, zoom: 0.4 },
	)
	const [size, setSize] = useState<Size | null>(null)
	const [panning, setPanning] = useState(false)
	// Mirrored to state only for the cursor affordance; the hot paths keep
	// reading the ref so keydown never re-renders the stage.
	const [spaceHeld, setSpaceHeld] = useState(false)

	const cameraRef = useRef(camera)
	cameraRef.current = camera
	const frameRef = useRef(0)
	const spaceDown = useRef(false)
	const drag = useRef<{
		pointerId: number
		lastX: number
		lastY: number
	} | null>(null)
	const didInitCamera = useRef(false)

	const artboards = useMemo(
		() => props.items.filter((item) => item.kind === 'artboard'),
		[props.items],
	)

	const bounds = useMemo(
		() =>
			unionRects(
				artboards
					.map((item) =>
						item.kind === 'artboard'
							? placedItemRect(item, props.measured)
							: null,
					)
					.filter((rect): rect is Rect => rect !== null),
			),
		[artboards, props.measured],
	)

	// Camera updates stream in faster than display rate on trackpads; the ref
	// holds the latest value and one rAF per frame commits it to React state.
	// onCameraMove goes through a ref so its identity never re-arms the scheduler.
	const onCameraMoveRef = useRef(props.onCameraMove)
	onCameraMoveRef.current = props.onCameraMove
	const scheduleCamera = useCallback((next: (camera: Camera) => Camera) => {
		cameraRef.current = next(cameraRef.current)
		cancelAnimationFrame(frameRef.current)
		frameRef.current = requestAnimationFrame(() => {
			setCameraState(cameraRef.current)
			onCameraMoveRef.current?.(cameraRef.current)
		})
	}, [])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		const observer = new ResizeObserver(() => {
			setSize({ width: container.clientWidth, height: container.clientHeight })
		})
		observer.observe(container)
		return () => observer.disconnect()
	}, [])

	const fitAll = useCallback(() => {
		const container = containerRef.current
		if (!container || !bounds) return
		const viewport = {
			width: container.clientWidth,
			height: container.clientHeight,
		}
		scheduleCamera(() => fitBounds(bounds, viewport, FIT_PADDING))
	}, [bounds, scheduleCamera])

	const zoomTo = useCallback(
		(zoom: number) => {
			const container = containerRef.current
			if (!container) return
			const cx = container.clientWidth / 2
			const cy = container.clientHeight / 2
			scheduleCamera((camera) => zoomAtPoint(camera, cx, cy, zoom))
		},
		[scheduleCamera],
	)

	// Fit before paint. Same Stage stays mounted across page switches; rAF
	// here would show the previous camera (or 0,0) for a frame.
	const prevFitKey = useRef<string | undefined>(undefined)
	const prevFocusKey = useRef<string | undefined>(undefined)
	useLayoutEffect(() => {
		const viewport =
			size ??
			(containerRef.current
				? {
						width: containerRef.current.clientWidth,
						height: containerRef.current.clientHeight,
					}
				: null)
		if (!viewport || viewport.width === 0 || viewport.height === 0) return

		const keyChanged = prevFitKey.current !== props.fitKey
		const focusChanged = prevFocusKey.current !== props.focusKey
		const first = !didInitCamera.current
		if (!first && !keyChanged && !focusChanged) return
		prevFitKey.current = props.fitKey
		prevFocusKey.current = props.focusKey
		didInitCamera.current = true

		if (first && props.initialCamera) {
			cancelAnimationFrame(frameRef.current)
			cameraRef.current = props.initialCamera
			setCameraState(props.initialCamera)
			return
		}

		const focus = props.focusKey
			? artboards.find(
					(item) => item.kind === 'artboard' && item.key === props.focusKey,
				)
			: undefined
		const next =
			focus && focus.kind === 'artboard'
				? fitBounds(placedItemRect(focus, props.measured), viewport, 160)
				: bounds
					? fitBounds(bounds, viewport, FIT_PADDING)
					: null
		if (!next) return
		cancelAnimationFrame(frameRef.current)
		cameraRef.current = next
		setCameraState(next)
	}, [
		props.fitKey,
		props.focusKey,
		props.initialCamera,
		size,
		bounds,
		artboards,
		props.measured,
	])

	// Wheel: scroll pans, pinch/⌘-scroll zooms at the cursor (Figma semantics).
	// Non-passive so the page never scrolls or browser-zooms behind the stage.
	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		const onWheel = (event: WheelEvent) => {
			event.preventDefault()
			const unit = event.deltaMode === 1 ? 16 : 1
			const rect = container.getBoundingClientRect()
			const cx = event.clientX - rect.left
			const cy = event.clientY - rect.top
			if (event.ctrlKey || event.metaKey) {
				const speed = event.ctrlKey ? 0.011 : 0.0038
				const factor = Math.exp(-event.deltaY * unit * speed)
				scheduleCamera((camera) =>
					zoomAtPoint(camera, cx, cy, camera.zoom * factor),
				)
			} else {
				scheduleCamera((camera) =>
					panBy(camera, -event.deltaX * unit, -event.deltaY * unit),
				)
			}
		}
		container.addEventListener('wheel', onWheel, { passive: false })
		return () => container.removeEventListener('wheel', onWheel)
	}, [scheduleCamera])

	// Space-held and middle-drag pan anywhere; primary-drag pans from empty
	// stage only so artboard content stays interactive.
	const onPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			// Chrome overlays (HUD, minimap) live inside the stage for coordinate
			// space; their interactions must never start a pan or lose the click
			// to the container's pointer capture.
			if (
				event.target instanceof Element &&
				event.target.closest('[data-dc-chrome]')
			) {
				return
			}
			const onArtboard =
				event.target instanceof HTMLElement &&
				event.target.closest('[data-artboard]') !== null
			const mayPan =
				event.button === 1 ||
				spaceDown.current ||
				(event.button === 0 && !onArtboard)
			if (!mayPan) return
			event.preventDefault()
			event.currentTarget.setPointerCapture(event.pointerId)
			drag.current = {
				pointerId: event.pointerId,
				lastX: event.clientX,
				lastY: event.clientY,
			}
			setPanning(true)
		},
		[],
	)

	const onPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const active = drag.current
			if (!active || active.pointerId !== event.pointerId) return
			const dx = event.clientX - active.lastX
			const dy = event.clientY - active.lastY
			active.lastX = event.clientX
			active.lastY = event.clientY
			scheduleCamera((camera) => panBy(camera, dx, dy))
		},
		[scheduleCamera],
	)

	const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (drag.current?.pointerId !== event.pointerId) return
		drag.current = null
		setPanning(false)
	}, [])

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target)) return
			// Match by code too: some layouts and synthetic events don't deliver
			// key === ' '.
			if (event.key === ' ' || event.code === 'Space') {
				spaceDown.current = true
				setSpaceHeld(true)
				if (!event.repeat) event.preventDefault()
				return
			}
			if (!(event.metaKey || event.ctrlKey)) return
			if (event.key === '0') {
				event.preventDefault()
				fitAll()
			} else if (event.key === '1') {
				event.preventDefault()
				zoomTo(1)
			} else if (event.key === '=' || event.key === '+') {
				event.preventDefault()
				scheduleCamera((camera) => {
					const container = containerRef.current
					if (!container) return camera
					return zoomAtPoint(
						camera,
						container.clientWidth / 2,
						container.clientHeight / 2,
						camera.zoom * 1.25,
					)
				})
			} else if (event.key === '-') {
				event.preventDefault()
				scheduleCamera((camera) => {
					const container = containerRef.current
					if (!container) return camera
					return zoomAtPoint(
						camera,
						container.clientWidth / 2,
						container.clientHeight / 2,
						camera.zoom / 1.25,
					)
				})
			}
		}
		const onKeyUp = (event: KeyboardEvent) => {
			if (event.key === ' ' || event.code === 'Space') {
				spaceDown.current = false
				setSpaceHeld(false)
			}
		}
		// A focus loss mid-press would leave the flag stuck; reset it.
		const onBlur = () => {
			spaceDown.current = false
			setSpaceHeld(false)
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('blur', onBlur)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('blur', onBlur)
		}
	}, [fitAll, zoomTo, scheduleCamera])

	// Command palette and HUD dispatch stage commands as DOM events so the
	// pieces stay decoupled across lazy chunks.
	useEffect(() => {
		const onCommand = (event: Event) => {
			const detail = (event as CustomEvent<{ type: string }>).detail
			if (detail?.type === 'fit') fitAll()
			if (detail?.type === 'actual-size') zoomTo(1)
		}
		window.addEventListener('dc:command', onCommand)
		return () => window.removeEventListener('dc:command', onCommand)
	}, [fitAll, zoomTo])

	const dotsRect = useMemo(() => {
		if (!bounds) return { x: -2000, y: -2000, width: 4000, height: 4000 }
		const margin = 1600
		return {
			x: bounds.x - margin,
			y: bounds.y - margin,
			width: bounds.width + margin * 2,
			height: bounds.height + margin * 2,
		}
	}, [bounds])

	const screenToWorld = useCallback((screenX: number, screenY: number) => {
		const camera = cameraRef.current
		return {
			x: (screenX - camera.x) / camera.zoom,
			y: (screenY - camera.y) / camera.zoom,
		}
	}, [])

	const viewportCenterWorld = useCallback(() => {
		const container = containerRef.current
		const camera = cameraRef.current
		if (!container) return { x: 0, y: 0 }
		return {
			x: (container.clientWidth / 2 - camera.x) / camera.zoom,
			y: (container.clientHeight / 2 - camera.y) / camera.zoom,
		}
	}, [])

	const flyTo = useCallback(
		(rect: Rect) => {
			const container = containerRef.current
			if (!container) return
			const viewport = {
				width: container.clientWidth,
				height: container.clientHeight,
			}
			const fitted = fitBounds(rect, viewport, 200)
			// Flying to a pin never zooms in past actual size.
			if (fitted.zoom > 1) {
				const centered = fitBounds(rect, viewport, 0)
				scheduleCamera(() => ({ ...centered, zoom: 1 }))
			} else {
				scheduleCamera(() => fitted)
			}
		},
		[scheduleCamera],
	)

	const apiValue = useMemo<StageApiValue>(
		() => ({ screenToWorld, viewportCenterWorld, flyTo }),
		[screenToWorld, viewportCenterWorld, flyTo],
	)

	return (
		<StageApiContext.Provider value={apiValue}>
			<StageCameraContext.Provider value={camera}>
				<StageZoomContext.Provider value={camera.zoom}>
					<div
						ref={containerRef}
						className="dc-stage"
						data-panning={panning || undefined}
						data-space-pan={spaceHeld || undefined}
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={endDrag}
						onPointerCancel={endDrag}
					>
						<div
							className="dc-world"
							style={{
								transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
							}}
						>
							<div
								className="dc-dots"
								style={{
									left: dotsRect.x,
									top: dotsRect.y,
									width: dotsRect.width,
									height: dotsRect.height,
								}}
							/>
							{props.items.map((item) =>
								item.kind === 'label' ? (
									<div
										key={item.key}
										className={
											item.depth === 'group'
												? 'dc-label-group'
												: 'dc-label-canvas'
										}
										style={{ left: item.x, top: item.y }}
									>
										{/*
										 * Labels read at a constant screen size like Figma section
										 * names. The transform never affects layout, so the world-space
										 * band the layout reserved stays exact; overflow grows upward
										 * into the row gap, and the clamp keeps extreme zoom-outs from
										 * reaching the previous row's artboards.
										 */}
										<span
											style={{
												transform: `scale(${Math.min(1 / camera.zoom, 8)})`,
												transformOrigin: 'bottom left',
											}}
										>
											{item.text}
										</span>
									</div>
								) : (
									<Artboard
										key={item.key}
										item={item}
										onMeasure={props.onMeasure}
									/>
								),
							)}
							<ReferenceLayer />
						</div>
						{size ? (
							<>
								<Hud zoom={camera.zoom} onFit={fitAll} onZoomTo={zoomTo} />
								<Minimap
									items={artboards}
									measured={props.measured}
									camera={camera}
									viewport={size}
									onJump={(next) => scheduleCamera(() => next)}
								/>
							</>
						) : null}
						{props.canvas ? (
							<Annotator canvas={props.canvas} containerRef={containerRef} />
						) : null}
					</div>
				</StageZoomContext.Provider>
			</StageCameraContext.Provider>
		</StageApiContext.Provider>
	)
}
