import { describe, expect, it } from 'vitest'

import { createArtboardRenderPlan, selectArtboardLod } from './artboard-lod'

describe('selectArtboardLod', () => {
	it('starts in preview at overview scale and live above 50%', () => {
		expect(selectArtboardLod(undefined, 0.5)).toBe('preview')
		expect(selectArtboardLod(undefined, 0.501)).toBe('live')
	})

	it('uses hysteresis around the transition', () => {
		expect(selectArtboardLod('preview', 0.54)).toBe('preview')
		expect(selectArtboardLod('preview', 0.55)).toBe('live')
		expect(selectArtboardLod('live', 0.46)).toBe('live')
		expect(selectArtboardLod('live', 0.45)).toBe('preview')
	})
})

describe('createArtboardRenderPlan', () => {
	const candidates = [
		{ key: 'visible', rect: { x: 100, y: 100, width: 300, height: 300 } },
		{ key: 'overscan', rect: { x: 1_100, y: 100, width: 300, height: 300 } },
		{ key: 'offscreen', rect: { x: 2_000, y: 100, width: 300, height: 300 } },
	]

	it('mounts only the viewport and its screen-space overscan', () => {
		const plan = createArtboardRenderPlan({
			camera: { x: 0, y: 0, zoom: 1 },
			viewport: { width: 1_000, height: 800 },
			candidates,
			lod: 'live',
		})

		expect([...plan.keys()]).toEqual(['visible', 'overscan'])
		expect(plan.get('visible')?.lod).toBe('live')
	})

	it('orders preview warming from the viewport center', () => {
		const plan = createArtboardRenderPlan({
			camera: { x: 0, y: 0, zoom: 1 },
			viewport: { width: 1_000, height: 800 },
			candidates,
			lod: 'preview',
		})

		expect(plan.get('visible')!.priority).toBeLessThan(
			plan.get('overscan')!.priority,
		)
	})

	it('caps live DOM while preserving the remaining visible previews', () => {
		const many = Array.from({ length: 8 }, (_, index) => ({
			key: `frame-${index}`,
			rect: { x: index * 100, y: 100, width: 90, height: 300 },
		}))
		const plan = createArtboardRenderPlan({
			camera: { x: 0, y: 0, zoom: 1 },
			viewport: { width: 1_000, height: 800 },
			candidates: many,
			lod: 'live',
			liveArtboardBudget: 3,
		})

		expect(
			[...plan.values()].filter((entry) => entry.lod === 'live'),
		).toHaveLength(3)
		expect(
			[...plan.values()].filter((entry) => entry.lod === 'preview'),
		).toHaveLength(5)
	})

	it('spends the live budget on the focused frame first', () => {
		const plan = createArtboardRenderPlan({
			camera: { x: 0, y: 0, zoom: 1 },
			viewport: { width: 1_000, height: 800 },
			candidates,
			lod: 'live',
			focusKey: 'overscan',
			liveArtboardBudget: 1,
		})

		expect(plan.get('overscan')?.lod).toBe('live')
		expect(plan.get('visible')?.lod).toBe('preview')
	})

	it('tracks preview membership during a gesture without promoting the new viewport', () => {
		const plan = createArtboardRenderPlan({
			camera: { x: -2_000, y: 0, zoom: 1 },
			liveCamera: { x: 0, y: 0, zoom: 1 },
			viewport: { width: 1_000, height: 800 },
			candidates,
			lod: 'live',
		})

		expect([...plan.keys()]).toEqual(['offscreen'])
		expect(plan.get('offscreen')?.lod).toBe('preview')
	})
})
