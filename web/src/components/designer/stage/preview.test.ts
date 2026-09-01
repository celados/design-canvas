import { describe, expect, it } from 'vitest'

import { previewCanvasRect } from './preview-canvas'

describe('previewCanvasRect', () => {
	it('projects every frame as one rectangle at the shared camera zoom', () => {
		const camera = { x: -120, y: 80, zoom: 0.1 }

		expect(
			previewCanvasRect(camera, { x: 2_000, y: 300, width: 1_440 }, 11_940),
		).toEqual({ x: 80, y: 110, width: 144, height: 1_194 })
		expect(
			previewCanvasRect(camera, { x: 3_680, y: 300, width: 1_440 }, 480),
		).toEqual({ x: 248, y: 110, width: 144, height: 48 })
	})
})
