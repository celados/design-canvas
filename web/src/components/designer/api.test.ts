import type { ReactNode } from 'react'

import { describe, expect, it } from 'vitest'

import { resolveDesignerPages, viewport, type DesignerPage } from './api'

const leaf: ReactNode = 'artboard content'

// Loose input on purpose: some cases describe invalid pages a JS caller could
// still pass, which the union type makes unrepresentable in TS.
function page(partial: Record<string, unknown>) {
	return { name: 'hero', ...partial } as unknown as DesignerPage
}

describe('resolveDesignerPages', () => {
	it('wraps a bare component in a desktop variant', () => {
		const [canvas] = resolveDesignerPages([page({ component: leaf })])
		expect(canvas.id).toBe('hero')
		expect(canvas.title).toBe('hero')
		expect(canvas.group).toBe('Pages')
		expect(canvas.views).toHaveLength(1)
		expect(canvas.views[0]).toMatchObject({
			id: 'desktop',
			label: 'Desktop',
			width: viewport.desktop,
		})
	})

	it('keeps authored variants verbatim', () => {
		const [canvas] = resolveDesignerPages([
			page({
				title: 'Hero',
				group: 'Marketing',
				summary: 's',
				tags: ['a'],
				variants: [
					{
						name: 'mobile',
						label: 'Mobile',
						width: viewport.mobile,
						component: leaf,
					},
				],
			}),
		])
		expect(canvas.title).toBe('Hero')
		expect(canvas.group).toBe('Marketing')
		expect(canvas.views[0]).toMatchObject({ id: 'mobile', width: 390 })
	})

	it('rejects a page with neither component nor variants', () => {
		expect(() => resolveDesignerPages([page({})])).toThrow(/variants/)
	})

	it('rejects an empty variants array', () => {
		expect(() => resolveDesignerPages([page({ variants: [] })])).toThrow(
			/variants/,
		)
	})
})
