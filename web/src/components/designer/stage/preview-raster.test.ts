import { describe, expect, it } from 'vitest'

import { hasMeaningfulRasterContent, previewPixelRatio } from './preview-raster'

describe('previewPixelRatio', () => {
	it('does not upscale small artboards', () => {
		expect(previewPixelRatio(390, 844)).toBe(1)
	})

	it('bounds ordinary desktop previews by width', () => {
		expect(previewPixelRatio(1440, 900)).toBeCloseTo(480 / 1440)
	})

	it('preserves a tall artboard within dimension and pixel budgets', () => {
		const ratio = previewPixelRatio(1440, 20_000)

		expect(20_000 * ratio).toBeLessThanOrEqual(4096)
		expect(1440 * ratio * (20_000 * ratio)).toBeLessThanOrEqual(2_000_000)
	})
})

describe('hasMeaningfulRasterContent', () => {
	it('rejects pixels containing only the artboard background', () => {
		expect(
			hasMeaningfulRasterContent(
				new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]),
				false,
			),
		).toBe(false)
	})

	it('accepts visible foreground pixels', () => {
		expect(
			hasMeaningfulRasterContent(
				new Uint8ClampedArray([255, 255, 255, 255, 40, 40, 40, 255]),
				false,
			),
		).toBe(true)
	})
})
