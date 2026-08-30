import { describe, expect, it } from 'vitest'

import type { CanvasDefinition } from '../../api'
import type { Annotation } from './model'

import { annotationsToMarkdown } from './markdown'

const canvas: CanvasDefinition = {
	id: 'hero',
	title: 'Hero',
	group: 'Marketing',
	views: [
		{ id: 'desktop', label: 'Desktop', width: 1440, render: () => null },
		{ id: 'mobile', label: 'Mobile', width: 390, render: () => null },
	],
}

function annotation(partial: Partial<Annotation>): Annotation {
	return {
		id: 'a',
		canvasId: 'hero',
		viewId: 'desktop',
		comment: 'text',
		createdAt: 1,
		target: {
			sourceLoc: null,
			selector: '#cta',
			label: 'button "Get started"',
			relX: 0.5,
			relY: 0.25,
			worldX: 0,
			worldY: 0,
		},
		...partial,
	}
}

describe('annotationsToMarkdown', () => {
	it('groups entries under their view with width and position refs', () => {
		const markdown = annotationsToMarkdown(
			canvas,
			[annotation({ id: 'm', viewId: 'mobile' }), annotation({ id: 'd' })],
			'http://localhost/_design/c/hero',
		)
		expect(markdown).toContain('# Design review — Hero')
		expect(markdown).toContain('## Desktop · 1440px')
		expect(markdown).toContain('## Mobile · 390px')
		expect(markdown).toContain('- Ref: `#cta`')
		expect(markdown).toContain('Position: 50% × 25% of view')
	})

	it('sorts entries by creation time within a view', () => {
		const markdown = annotationsToMarkdown(
			canvas,
			[
				annotation({ id: 'second', comment: 'later remark', createdAt: 200 }),
				annotation({ id: 'first', comment: 'earlier remark', createdAt: 100 }),
			],
			'http://localhost/_design/c/hero',
		)
		expect(markdown.indexOf('earlier remark')).toBeLessThan(
			markdown.indexOf('later remark'),
		)
	})

	it('omits views without comments', () => {
		const markdown = annotationsToMarkdown(
			canvas,
			[annotation({ viewId: 'desktop' })],
			'http://localhost/_design/c/hero',
		)
		expect(markdown).not.toContain('Mobile')
	})
})
