import type { PointerEvent as ReactPointerEvent } from 'react'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useStageApi, useStageZoom } from './stage'

export type RefImage = {
	id: string
	src: string
	x: number
	y: number
	width: number
	opacity: number
}

const STORAGE_KEY = 'design-canvas:refs:v1'
const MAX_FILE_BYTES = 3 * 1024 * 1024
const MAX_IMAGES = 24

function loadImages(): RefImage[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return []
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter(
			(entry): entry is RefImage =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof (entry as RefImage).src === 'string' &&
				typeof (entry as RefImage).x === 'number',
		)
	} catch {
		return []
	}
}

function persistImages(images: RefImage[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
	} catch {
		// Quota exceeded: drop the oldest entries until it fits.
		if (images.length > 1) persistImages(images.slice(1))
	}
}

export function ReferenceLayer() {
	const zoom = useStageZoom()
	const { viewportCenterWorld } = useStageApi()
	const [images, setImages] = useState<RefImage[]>([])

	useEffect(() => {
		setImages(loadImages())
	}, [])

	const update = useCallback((id: string, patch: Partial<RefImage>) => {
		setImages((current) => {
			const next = current.map((image) =>
				image.id === id ? { ...image, ...patch } : image,
			)
			persistImages(next)
			return next
		})
	}, [])

	const remove = useCallback((id: string) => {
		setImages((current) => {
			const next = current.filter((image) => image.id !== id)
			persistImages(next)
			return next
		})
	}, [])

	const addFiles = useCallback(
		(files: Iterable<File>) => {
			for (const file of files) {
				if (!file.type.startsWith('image/')) continue
				if (file.size > MAX_FILE_BYTES) {
					console.warn(`[design] skipped ${file.name}: larger than 3MB`)
					continue
				}
				const reader = new FileReader()
				reader.onload = () => {
					const src = typeof reader.result === 'string' ? reader.result : null
					if (!src) return
					const center = viewportCenterWorld()
					setImages((current) => {
						if (current.length >= MAX_IMAGES) return current
						const next = [
							...current,
							{
								id: crypto.randomUUID(),
								src,
								x: center.x + current.length * 32,
								y: center.y + current.length * 32,
								width: 480,
								opacity: 1,
							},
						]
						persistImages(next)
						return next
					})
				}
				reader.readAsDataURL(file)
			}
		},
		[viewportCenterWorld],
	)

	useEffect(() => {
		const onPaste = (event: ClipboardEvent) => {
			if (!event.clipboardData) return
			addFiles(event.clipboardData.files)
		}
		const onDrop = (event: DragEvent) => {
			if (!event.dataTransfer?.files.length) return
			event.preventDefault()
			addFiles(event.dataTransfer.files)
		}
		const onDragOver = (event: DragEvent) => {
			if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
		}
		window.addEventListener('paste', onPaste)
		window.addEventListener('drop', onDrop)
		window.addEventListener('dragover', onDragOver)
		return () => {
			window.removeEventListener('paste', onPaste)
			window.removeEventListener('drop', onDrop)
			window.removeEventListener('dragover', onDragOver)
		}
	}, [addFiles])

	return (
		<>
			{images.map((image) => (
				<ReferenceImage
					key={image.id}
					image={image}
					zoom={zoom}
					onUpdate={update}
					onRemove={remove}
				/>
			))}
		</>
	)
}

function ReferenceImage(props: {
	image: RefImage
	zoom: number
	onUpdate: (id: string, patch: Partial<RefImage>) => void
	onRemove: (id: string) => void
}) {
	const { image, zoom } = props
	const drag = useRef<{ lastX: number; lastY: number } | null>(null)
	const resize = useRef<{ startX: number; startWidth: number } | null>(null)

	const onDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return
		event.stopPropagation()
		event.currentTarget.setPointerCapture(event.pointerId)
		drag.current = { lastX: event.clientX, lastY: event.clientY }
	}
	const onDragPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const active = drag.current
		if (!active) return
		const dx = (event.clientX - active.lastX) / zoom
		const dy = (event.clientY - active.lastY) / zoom
		active.lastX = event.clientX
		active.lastY = event.clientY
		props.onUpdate(image.id, { x: image.x + dx, y: image.y + dy })
	}
	const onDragPointerUp = () => {
		drag.current = null
	}

	const onResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		event.stopPropagation()
		event.currentTarget.setPointerCapture(event.pointerId)
		resize.current = { startX: event.clientX, startWidth: image.width }
	}
	const onResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const active = resize.current
		if (!active) return
		const width = Math.max(
			96,
			active.startWidth + (event.clientX - active.startX) / zoom,
		)
		props.onUpdate(image.id, { width })
	}
	const onResizePointerUp = () => {
		resize.current = null
	}

	return (
		<div
			className="dc-ref"
			style={{
				left: image.x,
				top: image.y,
				width: image.width,
				opacity: image.opacity,
			}}
			onPointerDown={onDragPointerDown}
			onPointerMove={onDragPointerMove}
			onPointerUp={onDragPointerUp}
		>
			<div
				className="dc-ref-toolbar"
				style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<input
					type="range"
					min={0.15}
					max={1}
					step={0.05}
					value={image.opacity}
					aria-label="Reference opacity"
					onChange={(event) =>
						props.onUpdate(image.id, { opacity: Number(event.target.value) })
					}
				/>
				<button
					type="button"
					title="Remove reference"
					onClick={() => props.onRemove(image.id)}
				>
					×
				</button>
			</div>
			<img src={image.src} alt="" draggable={false} />
			<div
				className="dc-ref-resize"
				style={{ transform: `scale(${1 / zoom})` }}
				onPointerDown={onResizePointerDown}
				onPointerMove={onResizePointerMove}
				onPointerUp={onResizePointerUp}
			/>
		</div>
	)
}
