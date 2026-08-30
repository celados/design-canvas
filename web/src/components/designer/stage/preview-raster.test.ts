import { describe, expect, it } from 'vitest'

import { previewPixelRatio } from './preview-raster'

describe('previewPixelRatio', () => {
	it('does not upscale small artboards', () => {
		expect(previewPixelRatio(390, 844)).toBe(1)
	})

	it('bounds ordinary desktop previews by width', () => {
		expect(previewPixelRatio(1440, 900)).toBeCloseTo(1200 / 1440)
	})

	it('preserves a tall artboard within dimension and pixel budgets', () => {
		const ratio = previewPixelRatio(1440, 20_000)

		expect(20_000 * ratio).toBeLessThanOrEqual(8192)
		expect(1440 * ratio * (20_000 * ratio)).toBeLessThanOrEqual(12_000_000)
	})
})
