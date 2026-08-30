import { describe, expect, it } from 'vitest'

import type { CanvasDefinition } from '../api'

import { artboardKey, layoutViews, layoutWall, placedItemRect } from './layout'

function canvas(id: string, group: string, widths: number[]): CanvasDefinition {
	return {
		id,
		title: id,
		group,
		views: widths.map((width) => ({
			id: `v${width}`,
			label: `${width}`,
			width,
			render: () => null,
		})),
	}
}

describe('artboardKey', () => {
	it('joins canvas and view with the :: separator', () => {
		expect(artboardKey('hero', 'desktop')).toBe('hero::desktop')
	})
})

describe('layoutViews', () => {
	it('places views in one row with column gaps', () => {
		const items = layoutViews(canvas('hero', 'Marketing', [1440, 390]))
		const artboards = items.filter((item) => item.kind === 'artboard')
		expect(artboards).toHaveLength(2)
		expect(artboards[0]).toMatchObject({ x: 0, y: 0, width: 1440 })
		// Second board starts after the first plus COL_GAP (72).
		expect(artboards[1]?.x).toBe(1440 + 72)
	})
})

describe('layoutWall', () => {
	it('emits one group label per distinct group and rows per canvas', () => {
		const definitions = [
			canvas('a', 'Marketing', [1440]),
			canvas('b', 'Marketing', [390]),
			canvas('c', 'Product', [1440]),
		]
		const items = layoutWall(definitions, new Map())
		const labels = items.filter((item) => item.kind === 'label')
		expect(labels.map((label) => label.text)).toEqual(['Marketing', 'Product'])
		expect(items.filter((item) => item.kind === 'artboard')).toHaveLength(3)
	})

	it('grows row height to the tallest measured artboard', () => {
		const definitions = [
			canvas('a', 'G', [1440, 390]),
			canvas('b', 'G', [1440]),
		]
		const keyA = artboardKey('a', 'v1440')
		const keyB = artboardKey('b', 'v1440')
		const measured = new Map([
			[keyA, 2000],
			[keyB, 800],
		])
		const items = layoutWall(definitions, measured)

		// Row 1 (canvas a): both boards share y; row height = max measurement.
		const aDesktop = items.find((item) => item.key === keyA)
		const aMobile = items.find((item) => item.key === artboardKey('a', 'v390'))
		expect(aDesktop?.y).toBe(aMobile?.y)

		// Row 2 starts below the tallest board of row 1 plus ROW_GAP (120),
		// after its own CANVAS_LABEL_H (44) band.
		const bDesktop = items.find((item) => item.key === keyB)
		expect(bDesktop?.y).toBe((aDesktop?.y ?? 0) + 2000 + 120 + 44)
	})
})

describe('placedItemRect', () => {
	it('prefers measured height over declared minHeight', () => {
		const [item] = layoutViews(canvas('a', 'G', [1440])) as Extract<
			ReturnType<typeof layoutViews>[number],
			{ kind: 'artboard' }
		>[]
		expect(placedItemRect(item, new Map([[item.key, 999]]))).toMatchObject({
			width: 1440,
			height: 999,
		})
		expect(placedItemRect(item, new Map())).toMatchObject({ height: 780 })
	})
})
