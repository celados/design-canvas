export type Camera = { x: number; y: number; zoom: number }
export type Rect = { x: number; y: number; width: number; height: number }
export type Size = { width: number; height: number }

export const ZOOM_MIN = 0.05
export const ZOOM_MAX = 4

export function clampZoom(zoom: number): number {
	return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

/** Zoom while keeping the world point under (cx, cy) fixed on screen. */
export function zoomAtPoint(
	camera: Camera,
	cx: number,
	cy: number,
	nextZoom: number,
): Camera {
	const zoom = clampZoom(nextZoom)
	if (zoom === camera.zoom) return camera
	const k = zoom / camera.zoom
	return { zoom, x: cx - (cx - camera.x) * k, y: cy - (cy - camera.y) * k }
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
	return { ...camera, x: camera.x + dx, y: camera.y + dy }
}

export function fitBounds(bounds: Rect, viewport: Size, padding = 96): Camera {
	const usableWidth = Math.max(1, viewport.width - padding * 2)
	const usableHeight = Math.max(1, viewport.height - padding * 2)
	const zoom = clampZoom(
		Math.min(usableWidth / bounds.width, usableHeight / bounds.height),
	)
	return {
		zoom,
		x: (viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom,
		y: (viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom,
	}
}

export function unionRects(rects: Rect[]): Rect | null {
	if (rects.length === 0) return null
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const rect of rects) {
		minX = Math.min(minX, rect.x)
		minY = Math.min(minY, rect.y)
		maxX = Math.max(maxX, rect.x + rect.width)
		maxY = Math.max(maxY, rect.y + rect.height)
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** World-space rect currently visible on screen. */
export function visibleWorldRect(camera: Camera, viewport: Size): Rect {
	return {
		x: -camera.x / camera.zoom,
		y: -camera.y / camera.zoom,
		width: viewport.width / camera.zoom,
		height: viewport.height / camera.zoom,
	}
}
