import type { PointerEvent as ReactPointerEvent } from 'react'

import { useMemo, useRef } from 'react'

import type { Camera, Size } from './camera'
import type { PlacedArtboard } from './layout'

import { unionRects, visibleWorldRect } from './camera'
import { placedItemRect } from './layout'

const MAP_WIDTH = 184
const MAP_HEIGHT = 128

type MinimapProps = {
	items: PlacedArtboard[]
	measured: ReadonlyMap<string, number>
	camera: Camera
	viewport: Size
	onJump: (camera: Camera) => void
}

export function Minimap(props: MinimapProps) {
	const { camera, viewport } = props
	const dragging = useRef(false)

	const worldBounds = useMemo(() => {
		const rects = props.items.map((item) =>
			placedItemRect(item, props.measured),
		)
		rects.push(visibleWorldRect(camera, viewport))
		return unionRects(rects)
	}, [props.items, props.measured, camera, viewport])

	if (!worldBounds) return null

	const scale = Math.min(
		MAP_WIDTH / worldBounds.width,
		MAP_HEIGHT / worldBounds.height,
	)
	const toMap = (wx: number, wy: number) => ({
		mx: (wx - worldBounds.x) * scale,
		my: (wy - worldBounds.y) * scale,
	})

	const jump = (event: ReactPointerEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()
		const wx = worldBounds.x + (event.clientX - rect.left) / scale
		const wy = worldBounds.y + (event.clientY - rect.top) / scale
		props.onJump({
			zoom: camera.zoom,
			x: viewport.width / 2 - wx * camera.zoom,
			y: viewport.height / 2 - wy * camera.zoom,
		})
	}

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		// Keep the stage's pan handler out of minimap drags.
		event.stopPropagation()
		event.currentTarget.setPointerCapture(event.pointerId)
		dragging.current = true
		jump(event)
	}
	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragging.current) jump(event)
	}
	const onPointerUp = () => {
		dragging.current = false
	}

	const view = visibleWorldRect(camera, viewport)
	const viewTopLeft = toMap(view.x, view.y)

	return (
		<div
			className="dc-minimap"
			data-dc-chrome
			style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			{props.items.map((item) => {
				const rect = placedItemRect(item, props.measured)
				const topLeft = toMap(rect.x, rect.y)
				return (
					<div
						key={item.key}
						className="dc-minimap-item"
						style={{
							left: topLeft.mx,
							top: topLeft.my,
							width: Math.max(2, rect.width * scale),
							height: Math.max(2, rect.height * scale),
						}}
					/>
				)
			})}
			<div
				className="dc-minimap-view"
				style={{
					left: viewTopLeft.mx,
					top: viewTopLeft.my,
					width: view.width * scale,
					height: view.height * scale,
				}}
			/>
		</div>
	)
}
