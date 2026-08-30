import { describe, expect, it } from 'vitest'

import {
	clampZoom,
	fitBounds,
	panBy,
	unionRects,
	visibleWorldRect,
	zoomAtPoint,
	ZOOM_MAX,
	ZOOM_MIN,
} from './camera'

describe('clampZoom', () => {
	it('clamps to the zoom range', () => {
		expect(clampZoom(0.001)).toBe(ZOOM_MIN)
		expect(clampZoom(99)).toBe(ZOOM_MAX)
		expect(clampZoom(1)).toBe(1)
	})
})

describe('zoomAtPoint', () => {
	it('keeps the world point under the anchor fixed on screen', () => {
		const camera = { x: 100, y: 50, zoom: 0.5 }
		const cx = 400
		const cy = 300
		const next = zoomAtPoint(camera, cx, cy, 1)
		// World point visible at (cx, cy) before must stay there after.
		const worldBefore = {
			x: (cx - camera.x) / camera.zoom,
			y: (cy - camera.y) / camera.zoom,
		}
		const worldAfter = {
			x: (cx - next.x) / next.zoom,
			y: (cy - next.y) / next.zoom,
		}
		expect(worldAfter.x).toBeCloseTo(worldBefore.x)
		expect(worldAfter.y).toBeCloseTo(worldBefore.y)
	})

	it('is a no-op when the zoom is already clamped', () => {
		const camera = { x: 1, y: 2, zoom: ZOOM_MAX }
		expect(zoomAtPoint(camera, 0, 0, 10)).toBe(camera)
	})
})

describe('panBy', () => {
	it('translates without touching zoom', () => {
		expect(panBy({ x: 1, y: 2, zoom: 3 }, 10, -4)).toEqual({
			x: 11,
			y: -2,
			zoom: 3,
		})
	})
})

describe('fitBounds', () => {
	it('centers the bounds inside the viewport', () => {
		const camera = fitBounds(
			{ x: 0, y: 0, width: 800, height: 600 },
			{ width: 1600, height: 1200 },
			100,
		)
		// Usable area 1400×1000 → zoom limited by height: 1000/600.
		expect(camera.zoom).toBeCloseTo(1000 / 600)
		expect(camera.x).toBeCloseTo((1600 - 800 * camera.zoom) / 2)
		expect(camera.y).toBeCloseTo((1200 - 600 * camera.zoom) / 2)
	})

	it('respects the zoom floor for huge bounds', () => {
		const camera = fitBounds(
			{ x: 0, y: 0, width: 1e6, height: 1e6 },
			{ width: 800, height: 600 },
			0,
		)
		expect(camera.zoom).toBe(ZOOM_MIN)
	})
})

describe('unionRects', () => {
	it('returns null for no rects', () => {
		expect(unionRects([])).toBeNull()
	})

	it('unions across quadrants', () => {
		expect(
			unionRects([
				{ x: -10, y: -20, width: 5, height: 5 },
				{ x: 100, y: 40, width: 10, height: 10 },
			]),
		).toEqual({ x: -10, y: -20, width: 120, height: 70 })
	})
})

describe('visibleWorldRect', () => {
	it('inverts the camera transform', () => {
		const camera = { x: -120, y: 80, zoom: 2 }
		const viewport = { width: 640, height: 480 }
		const rect = visibleWorldRect(camera, viewport)
		expect(rect).toEqual({
			x: 60,
			y: -40,
			width: 320,
			height: 240,
		})
	})
})
