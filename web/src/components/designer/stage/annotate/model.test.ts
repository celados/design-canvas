// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import type { Annotation } from './model'

import {
	loadAnnotations,
	mergeAnnotations,
	parseAnnotations,
	saveAnnotations,
} from './model'

function annotation(id: string, createdAt = 1): Annotation {
	return {
		id,
		canvasId: 'hero',
		viewId: 'desktop',
		comment: `comment ${id}`,
		createdAt,
		target: {
			sourceLoc: null,
			selector: '#cta',
			label: 'button',
			relX: 0.5,
			relY: 0.5,
			worldX: 0,
			worldY: 0,
		},
	}
}

afterEach(() => {
	localStorage.clear()
})

describe('load/save roundtrip', () => {
	it('persists and reloads annotations', () => {
		saveAnnotations('hero', [annotation('a')])
		expect(loadAnnotations('hero')).toHaveLength(1)
	})

	it('returns empty for corrupt JSON or wrong shapes', () => {
		localStorage.setItem('design-canvas:annotations:v1:hero', '{oops')
		expect(loadAnnotations('hero')).toEqual([])
		localStorage.setItem(
			'design-canvas:annotations:v1:hero',
			JSON.stringify([{ id: 42 }, 'nope', null]),
		)
		expect(loadAnnotations('hero')).toEqual([])
	})
})

describe('parseAnnotations', () => {
	it('drops structurally invalid entries but keeps valid ones', () => {
		const parsed = parseAnnotations([annotation('ok'), { id: 'x' }, null, 42])
		expect(parsed.map((entry) => entry.id)).toEqual(['ok'])
	})
})

describe('mergeAnnotations', () => {
	it('unions by id without dropping either side', () => {
		const merged = mergeAnnotations(
			[annotation('a'), annotation('b')],
			[annotation('c')],
		)
		expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c'])
	})

	it('prefers the newer comment on id collision', () => {
		const merged = mergeAnnotations(
			[annotation('a', 100)],
			[annotation('a', 200)],
		)
		expect(merged).toHaveLength(1)
		expect(merged[0]?.createdAt).toBe(200)
	})
})
