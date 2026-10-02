// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

import type { CanvasDefinition } from '../api'
import type { PlacedArtboard } from './layout'

import { readHotspots } from './prototype-connections'

function canvas(id: string): CanvasDefinition {
	return {
		id,
		title: id,
		group: 'Pages',
		views: [
			{ id: 'desktop', label: 'Desktop', width: 100, render: () => null },
		],
	}
}

function artboard(definition: CanvasDefinition, x: number): PlacedArtboard {
	return {
		kind: 'artboard',
		key: `${definition.id}::desktop`,
		x,
		y: 0,
		width: 100,
		canvas: definition,
		view: definition.views[0]!,
	}
}

describe('readHotspots', () => {
	it('reads repeated live hotspots as one graph relation', () => {
		const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		rectSpy.mockImplementation(function (this: HTMLElement) {
			if (this.dataset.dcFrame) return new DOMRect(0, 0, 100, 100)
			if (this.dataset.dcPrototypeTo) {
				return new DOMRect(20, 40, 20, 10)
			}
			return new DOMRect(0, 0, 0, 0)
		})

		const world = document.createElement('div')
		const frame = document.createElement('div')
		frame.dataset.dcFrame = 'home::desktop'
		world.append(frame)
		for (let index = 0; index < 2; index += 1) {
			const hotspot = document.createElement('button')
			hotspot.dataset.dcPrototypeId = 'open'
			hotspot.dataset.dcPrototypeLabel = 'Open'
			hotspot.dataset.dcPrototypeTo = 'pricing'
			frame.append(hotspot)
		}

		const home = canvas('home')

		expect(readHotspots(world, [artboard(home, 0)])).toEqual([
			{
				key: 'home::desktop::open',
				fromCanvasId: 'home',
				fromViewId: 'desktop',
				toCanvasId: 'pricing',
				label: 'Open',
				point: { x: 30, y: 45 },
			},
		])

		rectSpy.mockRestore()
	})
})
