import type { ReactNode } from 'react'

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'

import type { CanvasView } from '../api'
import type {
	ArtboardSnapshotCache,
	ArtboardPreviewState,
	ArtboardSnapshotProvider as ArtboardSnapshotProviderValue,
	ArtboardSnapshotRequest,
	ArtboardSnapshotStore,
} from './preview-store'

import { ArtboardErrorBoundary } from './artboard-error-boundary'
import { createBrowserArtboardSnapshotCache } from './preview-cache'
import { previewPixelRatio } from './preview-raster'
import { createArtboardSnapshotStore } from './preview-store'

type SnapshotDiagnostics = {
	read: ArtboardSnapshotStore['readMetrics']
}

declare global {
	interface Window {
		__DESIGN_CANVAS_SNAPSHOTS__?: SnapshotDiagnostics
	}
}

const CAPTURE_TIMEOUT_MS = 12_000
const INITIAL_CAPTURE_DELAY_MS = 1_200
const CAPTURE_COOLDOWN_MS = 150
const SnapshotProviderContext =
	createContext<ArtboardSnapshotProviderValue | null>(null)

export function ArtboardSnapshotProvider(props: {
	children: ReactNode
	provider?: ArtboardSnapshotProviderValue
	cache?: ArtboardSnapshotCache | null
}) {
	const [store] = useState(() =>
		createArtboardSnapshotStore({
			cache:
				props.cache === null
					? undefined
					: (props.cache ?? createBrowserArtboardSnapshotCache()),
			initialCaptureDelayMs: INITIAL_CAPTURE_DELAY_MS,
			captureCooldownMs: CAPTURE_COOLDOWN_MS,
		}),
	)
	const provider = props.provider ?? store

	useEffect(() => () => store.dispose(), [store])
	useEffect(() => {
		const resumeWhenVisible = () => {
			if (!document.hidden) store.deferCaptures(0)
		}
		document.addEventListener('visibilitychange', resumeWhenVisible)
		return () =>
			document.removeEventListener('visibilitychange', resumeWhenVisible)
	}, [store])
	useEffect(() => {
		if (!import.meta.env.DEV) return
		const diagnostics = { read: store.readMetrics }
		window.__DESIGN_CANVAS_SNAPSHOTS__ = diagnostics
		return () => {
			if (window.__DESIGN_CANVAS_SNAPSHOTS__ === diagnostics) {
				delete window.__DESIGN_CANVAS_SNAPSHOTS__
			}
		}
	}, [store])

	return (
		<SnapshotProviderContext.Provider value={provider}>
			{props.children}
			{props.provider ? null : <PreviewCaptureHost store={store} />}
		</SnapshotProviderContext.Provider>
	)
}

export function useSnapshotCaptureDeferral(): (delayMs?: number) => void {
	const provider = useSnapshotProvider()
	return useCallback(
		(delayMs = 350) => provider.deferCaptures?.(delayMs),
		[provider],
	)
}

function useSnapshotProvider(): ArtboardSnapshotProviderValue {
	const provider = useContext(SnapshotProviderContext)
	if (!provider) {
		throw new Error(
			'useArtboardPreview must be used under <ArtboardSnapshotProvider>',
		)
	}
	return provider
}

export function useArtboardPreview(
	key: string,
	view: CanvasView,
	enabled = true,
	priority = 0,
): ArtboardPreviewState {
	const provider = useSnapshotProvider()
	const version = view.previewVersion ?? view
	const connection = useMemo(
		() => provider.connect({ key, version, view }),
		[key, provider, version, view],
	)
	const state = useSyncExternalStore(
		connection.subscribe,
		connection.read,
		connection.read,
	)

	useEffect(() => {
		if (!enabled) return
		return connection.activate(priority)
	}, [connection, enabled])
	useEffect(() => {
		if (enabled) connection.updatePriority(priority)
	}, [connection, enabled, priority])
	useEffect(() => {
		if (!enabled || state.status !== 'failed' || !document.hidden) return
		const retryWhenVisible = () => {
			if (!document.hidden) connection.retry()
		}
		document.addEventListener('visibilitychange', retryWhenVisible)
		return () =>
			document.removeEventListener('visibilitychange', retryWhenVisible)
	}, [connection, enabled, state.status])

	return state
}

function PreviewCaptureHost(props: { store: ArtboardSnapshotStore }) {
	const fontEmbedCache = useRef(new Map<string, Promise<string>>())
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
			fontEmbedCache={fontEmbedCache.current}
		/>
	) : null
}

function PreviewCaptureSurface(props: {
	request: ArtboardSnapshotRequest
	store: ArtboardSnapshotStore
	fontEmbedCache: Map<string, Promise<string>>
}) {
	const { fontEmbedCache, request, store } = props
	const frameRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const frame = frameRef.current
		if (!frame) return
		let cancelled = false

		const capture = async () => {
			const pendingCapture = captureFrame(frame, request, fontEmbedCache)
			try {
				const result = await withTimeout(pendingCapture, CAPTURE_TIMEOUT_MS)
				const src = URL.createObjectURL(result.blob)
				if (cancelled) {
					URL.revokeObjectURL(src)
					return
				}
				store.resolve(
					request,
					{
						src,
						width: request.view.width,
						height: result.height,
					},
					result.blob,
				)
			} catch (error) {
				if (!cancelled) store.reject(request, error, pendingCapture)
			}
		}

		void capture()
		return () => {
			cancelled = true
		}
	}, [fontEmbedCache, request, store])

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

async function captureFrame(
	frame: HTMLElement,
	request: ArtboardSnapshotRequest,
	fontEmbedCache: Map<string, Promise<string>>,
): Promise<{ blob: Blob; height: number }> {
	await waitForCaptureAssets(frame)
	const height = Math.ceil(frame.offsetHeight)
	const htmlToImage = await import('html-to-image')
	const fontKey = readFontKey(frame)
	let fontEmbedCSS = fontEmbedCache.get(fontKey)
	if (!fontEmbedCSS) {
		fontEmbedCSS = htmlToImage.getFontEmbedCSS(frame)
		fontEmbedCache.set(fontKey, fontEmbedCSS)
		fontEmbedCSS.catch(() => fontEmbedCache.delete(fontKey))
	}
	const blob = await htmlToImage.toBlob(frame, {
		pixelRatio: previewPixelRatio(request.view.width, height),
		backgroundColor: request.view.dark ? '#09090b' : '#ffffff',
		fontEmbedCSS: await fontEmbedCSS,
	})
	if (!blob) throw new Error('Artboard preview produced an empty image')
	return { blob, height }
}

function readFontKey(frame: HTMLElement): string {
	const fonts = new Set<string>()
	for (const element of [frame, ...frame.querySelectorAll<HTMLElement>('*')]) {
		fonts.add(getComputedStyle(element).fontFamily)
	}
	return [...fonts].sort().join('\n')
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error('Artboard preview capture timed out')),
			timeoutMs,
		)
		promise.then(
			(value) => {
				clearTimeout(timeout)
				resolve(value)
			},
			(error: unknown) => {
				clearTimeout(timeout)
				reject(error)
			},
		)
	})
}

export function ArtboardPreviewImage(props: {
	previewKey: string
	view: CanvasView
	enabled?: boolean
	priority?: number
}) {
	const state = useArtboardPreview(
		props.previewKey,
		props.view,
		props.enabled,
		props.priority,
	)
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
