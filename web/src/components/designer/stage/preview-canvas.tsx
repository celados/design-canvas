import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'

import type { Camera, Rect, Size } from './camera'
import type { PlacedArtboard } from './layout'
import type { ArtboardPreviewState } from './preview-store'

import { useArtboardPreview } from './preview'

export type PreviewCanvasEntry = {
	item: PlacedArtboard
	fallbackHeight: number
	priority: number
}

type LoadedCanvasPreview = {
	image: HTMLImageElement
	preview: Extract<ArtboardPreviewState, { status: 'ready' }>['preview']
}

const MAX_CANVAS_DPR = 2

export function previewCanvasRect(
	camera: Camera,
	item: Pick<PlacedArtboard, 'x' | 'y' | 'width'>,
	height: number,
): Rect {
	return {
		x: camera.x + item.x * camera.zoom,
		y: camera.y + item.y * camera.zoom,
		width: item.width * camera.zoom,
		height: height * camera.zoom,
	}
}

export function PreviewCanvas(props: {
	camera: Camera
	viewport: Size | null
	entries: PreviewCanvasEntry[]
	selectedKey: string | null
	onMeasure: (key: string, height: number) => void
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const assetsRef = useRef(new Map<string, LoadedCanvasPreview>())
	const [assetRevision, setAssetRevision] = useState(0)
	const registerAsset = useCallback(
		(key: string, asset: LoadedCanvasPreview) => {
			const current = assetsRef.current.get(key)
			if (current?.image === asset.image) return
			assetsRef.current.set(key, asset)
			setAssetRevision((revision) => revision + 1)
		},
		[],
	)
	const unregisterAsset = useCallback(
		(key: string, image: HTMLImageElement) => {
			const current = assetsRef.current.get(key)
			// A previous decode can finish after the same key reconnects. Its cleanup
			// must not evict the newer image that now owns this registry slot.
			if (current?.image !== image) return
			assetsRef.current.delete(key)
			setAssetRevision((revision) => revision + 1)
		},
		[],
	)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const redraw = () => setAssetRevision((revision) => revision + 1)
		const onContextLost = (event: Event) => event.preventDefault()
		let dprQuery: MediaQueryList | null = null
		const onDprChange = () => {
			redraw()
			observeDpr()
		}
		const observeDpr = () => {
			dprQuery?.removeEventListener('change', onDprChange)
			dprQuery = window.matchMedia(
				`(resolution: ${window.devicePixelRatio || 1}dppx)`,
			)
			dprQuery.addEventListener('change', onDprChange)
		}
		if (typeof window.matchMedia === 'function') observeDpr()
		canvas.addEventListener('contextlost', onContextLost)
		canvas.addEventListener('contextrestored', redraw)
		return () => {
			dprQuery?.removeEventListener('change', onDprChange)
			canvas.removeEventListener('contextlost', onContextLost)
			canvas.removeEventListener('contextrestored', redraw)
		}
	}, [])

	useLayoutEffect(() => {
		const canvas = canvasRef.current
		const viewport = props.viewport
		if (!canvas || !viewport) return
		const ratio = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR)
		const pixelWidth = Math.max(1, Math.round(viewport.width * ratio))
		const pixelHeight = Math.max(1, Math.round(viewport.height * ratio))
		if (canvas.width !== pixelWidth) canvas.width = pixelWidth
		if (canvas.height !== pixelHeight) canvas.height = pixelHeight
		const context = canvas.getContext('2d')
		if (!context) return

		context.setTransform(ratio, 0, 0, ratio, 0, 0)
		context.clearRect(0, 0, viewport.width, viewport.height)
		context.imageSmoothingEnabled = true
		context.imageSmoothingQuality = 'high'

		for (const entry of props.entries) {
			const asset = assetsRef.current.get(entry.item.key)
			const height = asset?.preview.height ?? entry.fallbackHeight
			const rect = previewCanvasRect(props.camera, entry.item, height)
			if (!intersectsViewport(rect, viewport)) continue
			drawCanvasArtboard(
				context,
				entry.item,
				rect,
				asset,
				props.selectedKey === entry.item.key,
			)
		}
	}, [
		assetRevision,
		props.camera,
		props.entries,
		props.selectedKey,
		props.viewport,
	])

	return (
		<>
			<canvas
				className="dc-preview-canvas"
				ref={canvasRef}
				aria-hidden="true"
			/>
			{props.entries.map((entry) => (
				<PreviewCanvasAsset
					key={entry.item.key}
					entry={entry}
					onAsset={registerAsset}
					onAssetRemove={unregisterAsset}
					onMeasure={props.onMeasure}
				/>
			))}
		</>
	)
}

function PreviewCanvasAsset(props: {
	entry: PreviewCanvasEntry
	onAsset: (key: string, asset: LoadedCanvasPreview) => void
	onAssetRemove: (key: string, image: HTMLImageElement) => void
	onMeasure: (key: string, height: number) => void
}) {
	const { entry } = props
	const state = useArtboardPreview(
		entry.item.key,
		entry.item.view,
		true,
		entry.priority,
	)
	const preview = state.status === 'ready' ? state.preview : null

	useEffect(() => {
		if (!preview) return
		props.onMeasure(entry.item.key, preview.height)
	}, [entry.item.key, preview, props.onMeasure])

	useEffect(() => {
		if (!preview) return
		let cancelled = false
		const image = new Image()
		image.decoding = 'async'
		image.src = preview.src
		const load = async () => {
			try {
				await image.decode()
			} catch {
				if (!image.complete || image.naturalWidth === 0) return
			}
			if (!cancelled) props.onAsset(entry.item.key, { image, preview })
		}
		void load()
		return () => {
			cancelled = true
			props.onAssetRemove(entry.item.key, image)
		}
	}, [entry.item.key, preview, props.onAsset, props.onAssetRemove])

	return null
}

function intersectsViewport(rect: Rect, viewport: Size): boolean {
	return (
		rect.x <= viewport.width &&
		rect.x + rect.width >= 0 &&
		rect.y <= viewport.height &&
		rect.y + rect.height >= 0
	)
}

function drawCanvasArtboard(
	context: CanvasRenderingContext2D,
	item: PlacedArtboard,
	rect: Rect,
	asset: LoadedCanvasPreview | undefined,
	selected: boolean,
) {
	const radius = Math.min(10 * Math.max(0.2, rect.width / item.width), 4)
	context.save()
	context.beginPath()
	context.roundRect(rect.x, rect.y, rect.width, rect.height, radius)
	context.clip()
	context.fillStyle = item.view.dark ? '#09090b' : '#ffffff'
	context.fillRect(rect.x, rect.y, rect.width, rect.height)
	if (asset) {
		context.drawImage(asset.image, rect.x, rect.y, rect.width, rect.height)
	}
	context.restore()

	if (selected) {
		context.strokeStyle = '#818cf8'
		context.lineWidth = 2
		context.strokeRect(
			rect.x + 1,
			rect.y + 1,
			Math.max(0, rect.width - 2),
			Math.max(0, rect.height - 2),
		)
	}

	if (rect.width >= 8 && rect.height >= 8) {
		context.strokeStyle = 'rgb(255 255 255 / 0.1)'
		context.lineWidth = 1
		context.strokeRect(
			Math.round(rect.x) + 0.5,
			Math.round(rect.y) + 0.5,
			Math.max(0, Math.round(rect.width) - 1),
			Math.max(0, Math.round(rect.height) - 1),
		)
	}

	drawCanvasLabel(context, item, rect)
}

function drawCanvasLabel(
	context: CanvasRenderingContext2D,
	item: PlacedArtboard,
	rect: Rect,
) {
	const scale = Math.min(1, Math.max(0.4, 8 * (rect.width / item.width)))
	const fontSize = 12 * scale
	if (rect.width < 12 || fontSize < 4) return
	const title = item.labelPrefix
		? `${item.labelPrefix} · ${item.view.label}`
		: item.view.label
	context.save()
	context.font = `600 ${fontSize}px "Inter Variable", ui-sans-serif, system-ui, sans-serif`
	context.fillStyle = '#f5f5f5'
	context.textBaseline = 'bottom'
	context.fillText(
		truncateCanvasText(context, title, Math.max(0, rect.width)),
		rect.x,
		rect.y - Math.max(2, 6 * scale),
	)
	context.restore()
}

function truncateCanvasText(
	context: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string {
	if (context.measureText(text).width <= maxWidth) return text
	const ellipsis = '…'
	let end = text.length
	while (end > 0) {
		const candidate = `${text.slice(0, end)}${ellipsis}`
		if (context.measureText(candidate).width <= maxWidth) return candidate
		end -= 1
	}
	return ''
}
