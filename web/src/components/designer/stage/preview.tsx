import type { ReactNode } from 'react'

import {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'

import type { CanvasView } from '../api'
import type { PlacedArtboard } from './layout'
import type {
	ArtboardPreviewRequest,
	ArtboardPreviewState,
	ArtboardPreviewStore,
} from './preview-store'

import { ArtboardErrorBoundary } from './artboard-error-boundary'
import { createArtboardPreviewStore } from './preview-store'
import { useStageZoom } from './stage'

const PreviewStoreContext = createContext<ArtboardPreviewStore | null>(null)

export function ArtboardPreviewProvider(props: { children: ReactNode }) {
	const [store] = useState(createArtboardPreviewStore)

	useEffect(() => () => store.dispose(), [store])

	return (
		<PreviewStoreContext.Provider value={store}>
			{props.children}
			<PreviewCaptureHost store={store} />
		</PreviewStoreContext.Provider>
	)
}

function usePreviewStore(): ArtboardPreviewStore {
	const store = useContext(PreviewStoreContext)
	if (!store) {
		throw new Error(
			'useArtboardPreview must be used under <ArtboardPreviewProvider>',
		)
	}
	return store
}

function useArtboardPreview(
	key: string,
	view: CanvasView,
	enabled = true,
): ArtboardPreviewState {
	const store = usePreviewStore()
	const subscribe = useCallback(
		(listener: () => void) => store.subscribe(key, listener),
		[key, store],
	)
	const read = useCallback(() => store.read(key, view), [key, store, view])
	const state = useSyncExternalStore(subscribe, read, read)

	useEffect(() => {
		if (enabled) store.request(key, view)
	}, [enabled, key, store, view])

	return state
}

function PreviewCaptureHost(props: { store: ArtboardPreviewStore }) {
	const request = useSyncExternalStore(
		props.store.subscribeActive,
		props.store.readActive,
		props.store.readActive,
	)
	return request ? (
		<PreviewCaptureSurface
			key={request.id}
			request={request}
			store={props.store}
		/>
	) : null
}

function PreviewCaptureSurface(props: {
	request: ArtboardPreviewRequest
	store: ArtboardPreviewStore
}) {
	const { request, store } = props
	const frameRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const frame = frameRef.current
		if (!frame) return
		let cancelled = false

		const capture = async () => {
			try {
				await waitForCaptureAssets(frame)
				const height = Math.ceil(frame.offsetHeight)
				const { toBlob } = await import('html-to-image')
				// Overview never needs a full-density desktop raster. Bounding its
				// width keeps decoded-image memory predictable across large walls.
				const pixelRatio = Math.min(1, 1200 / request.view.width)
				const blob = await toBlob(frame, {
					pixelRatio,
					backgroundColor: request.view.dark ? '#09090b' : '#ffffff',
					cacheBust: true,
				})
				if (!blob) throw new Error('Artboard preview produced an empty image')
				const src = URL.createObjectURL(blob)
				if (cancelled) {
					URL.revokeObjectURL(src)
					return
				}
				store.resolve(request, {
					src,
					width: request.view.width,
					height,
				})
			} catch (error) {
				if (!cancelled) store.reject(request, error)
			}
		}

		void capture()
		return () => {
			cancelled = true
		}
	}, [request, store])

	return (
		<div
			aria-hidden="true"
			style={{
				position: 'fixed',
				left: -100_000,
				top: 0,
				pointerEvents: 'none',
			}}
		>
			<div
				ref={frameRef}
				className="dc-frame"
				style={{
					width: request.view.width,
					minHeight: request.view.minHeight ?? 480,
					backgroundColor: request.view.dark ? '#09090b' : '#ffffff',
					color: request.view.dark ? '#fafafa' : '#09090b',
				}}
			>
				<ArtboardErrorBoundary label={request.view.label}>
					{request.view.render()}
				</ArtboardErrorBoundary>
			</div>
		</div>
	)
}

async function waitForCaptureAssets(frame: HTMLElement): Promise<void> {
	const images = [...frame.querySelectorAll('img')]
	const assets = Promise.allSettled([
		document.fonts.ready,
		...images.map((image) => image.decode()),
	])
	// A remote image must not block every preview behind it indefinitely.
	await Promise.race([
		assets,
		new Promise<void>((resolve) => setTimeout(resolve, 3000)),
	])
	await nextPaint()
	await nextPaint()
}

function nextPaint(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export const PreviewArtboard = memo(function PreviewArtboard(props: {
	item: PlacedArtboard
	fallbackHeight: number
	onMeasure: (key: string, height: number) => void
}) {
	const { item } = props
	const zoom = useStageZoom()
	const state = useArtboardPreview(item.key, item.view)
	const preview = state.status === 'ready' ? state.preview : null
	const height = preview?.height ?? props.fallbackHeight
	const compact = zoom < 0.35
	const title = item.labelPrefix
		? `${item.labelPrefix} · ${item.view.label}`
		: item.view.label

	useEffect(() => {
		if (preview) props.onMeasure(item.key, preview.height)
	}, [item.key, preview, props.onMeasure])

	return (
		<div
			className="dc-preview-artboard absolute"
			style={{ left: item.x, top: item.y }}
			data-artboard
		>
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
					<span className="dc-chip tabular-nums">
						{item.width}×{height}
					</span>
				)}
			</div>
			<div
				className="dc-frame dc-preview-frame"
				style={{
					width: item.width,
					height,
					backgroundColor: item.view.dark ? '#09090b' : '#ffffff',
				}}
			>
				{preview ? (
					<img
						src={preview.src}
						alt=""
						width={preview.width}
						height={preview.height}
						draggable={false}
						decoding="async"
					/>
				) : (
					<div className="dc-preview-placeholder" data-status={state.status} />
				)}
			</div>
		</div>
	)
})

export function ArtboardPreviewImage(props: {
	previewKey: string
	view: CanvasView
	enabled?: boolean
}) {
	const state = useArtboardPreview(props.previewKey, props.view, props.enabled)
	return state.status === 'ready' ? (
		<img
			src={state.preview.src}
			alt=""
			width={state.preview.width}
			height={state.preview.height}
			draggable={false}
			decoding="async"
		/>
	) : (
		<div className="dc-preview-placeholder" data-status={state.status} />
	)
}
