import type { CanvasDefinition, CanvasView } from '../api'
import type { Rect } from './camera'

export const COL_GAP = 72
export const ROW_GAP = 120
export const GROUP_GAP = 200
export const FLOW_GAP = 240
const GROUP_LABEL_H = 64
const CANVAS_LABEL_H = 44
const FALLBACK_HEIGHT = 780

function resolvedArtboardHeight(
	view: CanvasView,
	measuredHeight: number | undefined,
): number {
	const authoritativeHeight = view.preview?.height ?? view.minHeight
	if (measuredHeight === undefined) {
		return authoritativeHeight ?? FALLBACK_HEIGHT
	}
	// Live DOM reports its 480px shell before long descendants finish layout.
	// A version-matched snapshot already knows the complete frame extent, so a
	// transient measurement may expand that geometry but must never truncate it.
	return authoritativeHeight === undefined
		? measuredHeight
		: Math.max(measuredHeight, authoritativeHeight)
}

export type PlacedArtboard = {
	kind: 'artboard'
	key: string
	x: number
	y: number
	width: number
	canvas: CanvasDefinition
	view: CanvasView
	/** Wall rows fold the canvas name into each artboard label: "Hero · Desktop". */
	labelPrefix?: string
}

export type PlacedLabel = {
	kind: 'label'
	key: string
	x: number
	y: number
	text: string
	depth: 'group' | 'canvas'
}

export type PlacedItem = PlacedArtboard | PlacedLabel

export function artboardKey(canvasId: string, viewId: string): string {
	return `${canvasId}::${viewId}`
}

/** Single canvas: its views in one top-aligned row. */
export function layoutViews(canvas: CanvasDefinition): PlacedItem[] {
	const items: PlacedItem[] = []
	let x = 0
	for (const view of canvas.views) {
		items.push({
			kind: 'artboard',
			key: artboardKey(canvas.id, view.id),
			x,
			y: 0,
			width: view.width,
			canvas,
			view,
		})
		x += view.width + COL_GAP
	}
	return items
}

/** Prototype overview: one representative view per canvas in registry order. */
export function layoutFlow(definitions: CanvasDefinition[]): PlacedItem[] {
	const items: PlacedItem[] = []
	let x = 0
	for (const canvas of definitions) {
		const view = canvas.views[0]
		if (!view) continue
		items.push({
			kind: 'artboard',
			key: artboardKey(canvas.id, view.id),
			x,
			y: 0,
			width: view.width,
			canvas,
			view,
			labelPrefix: canvas.title,
		})
		x += view.width + FLOW_GAP
	}
	return items
}

/**
 * Every canvas on one stage: group section, then rows of views per canvas. The
 * band above each row is reserved for the artboards' own labels (which carry
 * the canvas name via labelPrefix), so no separate canvas label item is emitted
 * — two label systems would fight for the same space.
 *
 * Row heights come from measured artboards so tall content never overlaps the
 * next row; the first pass falls back to declared minHeights and re-flows as
 * measurements arrive.
 */
export function layoutWall(
	definitions: CanvasDefinition[],
	measured: ReadonlyMap<string, number>,
): PlacedItem[] {
	const items: PlacedItem[] = []
	const groups = [...new Set(definitions.map((definition) => definition.group))]
	let y = 0

	for (const group of groups) {
		if (y > 0) y += GROUP_GAP
		items.push({
			kind: 'label',
			key: `group:${group}`,
			x: 0,
			y,
			text: group,
			depth: 'group',
		})
		y += GROUP_LABEL_H

		for (const canvas of definitions.filter(
			(definition) => definition.group === group,
		)) {
			y += CANVAS_LABEL_H
			let x = 0
			let rowHeight = 0
			for (const view of canvas.views) {
				const key = artboardKey(canvas.id, view.id)
				items.push({
					kind: 'artboard',
					key,
					x,
					y,
					width: view.width,
					canvas,
					view,
					labelPrefix: canvas.title,
				})
				rowHeight = Math.max(
					rowHeight,
					resolvedArtboardHeight(view, measured.get(key)),
				)
				x += view.width + COL_GAP
			}
			y += rowHeight + ROW_GAP
		}
	}

	return items
}

export function placedItemRect(
	item: PlacedArtboard,
	measured: ReadonlyMap<string, number>,
): Rect {
	return {
		x: item.x,
		y: item.y,
		width: item.width,
		height: resolvedArtboardHeight(item.view, measured.get(item.key)),
	}
}
