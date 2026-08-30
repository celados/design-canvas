// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import type { CanvasDefinition } from './api'
import type { PlacedArtboard } from './stage/layout'

import {
	prototypeConnectionPath,
	readPrototypeIntent,
	resolvePrototypeDestination,
	resolvePrototypeGraph,
	type PrototypeHotspot,
} from './prototype'

function canvas(id: string, viewIds: string[]): CanvasDefinition {
	return {
		id,
		title: id,
		group: 'Pages',
		views: viewIds.map((viewId) => ({
			id: viewId,
			label: viewId,
			width: 100,
			render: () => null,
		})),
	}
}

function artboard(
	definition: CanvasDefinition,
	viewId: string,
	x: number,
): PlacedArtboard {
	const view = definition.views.find((entry) => entry.id === viewId)
	if (!view) throw new Error(`Missing view ${viewId}`)
	return {
		kind: 'artboard',
		key: `${definition.id}::${viewId}`,
		x,
		y: 0,
		width: view.width,
		canvas: definition,
		view,
	}
}

const hotspot: PrototypeHotspot = {
	key: 'home::desktop::cta',
	fromCanvasId: 'home',
	fromViewId: 'desktop',
	toCanvasId: 'pricing',
	point: { x: 80, y: 50 },
}

describe('resolvePrototypeGraph', () => {
	it('connects a hotspot to the matching target view', () => {
		const home = canvas('home', ['desktop'])
		const pricing = canvas('pricing', ['mobile', 'desktop'])
		const graph = resolvePrototypeGraph(
			[hotspot],
			[
				artboard(home, 'desktop', 0),
				artboard(pricing, 'mobile', 300),
				artboard(pricing, 'desktop', 500),
			],
			new Map([
				['pricing::desktop', 200],
				['pricing::mobile', 160],
			]),
		)

		expect(graph.unresolved).toHaveLength(0)
		expect(graph.connections).toEqual([
			{
				key: hotspot.key,
				from: hotspot.point,
				to: { x: 500, y: 100 },
			},
		])
	})

	it('reports targets that are not in the page registry', () => {
		const graph = resolvePrototypeGraph([hotspot], [], new Map())
		expect(graph.connections).toHaveLength(0)
		expect(graph.unresolved).toEqual([hotspot])
	})
})

describe('prototype helpers', () => {
	it('preserves the source view when the target supports it', () => {
		const destination = resolvePrototypeDestination(
			[canvas('pricing', ['desktop', 'mobile'])],
			'pricing',
			'mobile',
		)
		expect(destination).toEqual({ canvasId: 'pricing', viewId: 'mobile' })
	})

	it('falls back to the target canvas when the source view is absent', () => {
		const destination = resolvePrototypeDestination(
			[canvas('pricing', ['desktop'])],
			'pricing',
			'mobile',
		)
		expect(destination).toEqual({ canvasId: 'pricing', viewId: undefined })
	})

	it('builds a stable cubic path', () => {
		expect(
			prototypeConnectionPath({
				key: 'edge',
				from: { x: 10, y: 20 },
				to: { x: 110, y: 80 },
			}),
		).toBe('M 10 20 C 74 20 46 80 110 80')
	})

	it('reads a modified click from a declared hotspot', () => {
		const frame = document.createElement('div')
		frame.dataset.dcFrame = 'home::mobile'
		const hotspotElement = document.createElement('button')
		hotspotElement.dataset.dcPrototypeTo = 'pricing'
		const child = document.createElement('span')
		hotspotElement.append(child)
		frame.append(hotspotElement)

		expect(readPrototypeIntent(child, true)).toEqual({
			canvasId: 'pricing',
			sourceViewId: 'mobile',
		})
		expect(readPrototypeIntent(child, false)).toBeNull()
	})
})
