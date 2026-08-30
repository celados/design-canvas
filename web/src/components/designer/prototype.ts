import type { CanvasDefinition } from './api'
import type { PlacedArtboard, PlacedItem } from './stage/layout'

import { placedItemRect } from './stage/layout'

export type PrototypeHotspot = {
	key: string
	fromCanvasId: string
	fromViewId: string
	toCanvasId: string
	label?: string
	point: { x: number; y: number }
}

export type PrototypeConnection = {
	key: string
	label?: string
	from: { x: number; y: number }
	to: { x: number; y: number }
}

export type PrototypeGraph = {
	connections: PrototypeConnection[]
	unresolved: PrototypeHotspot[]
}

export function readPrototypeIntent(
	target: EventTarget | null,
	modified: boolean,
): { canvasId: string; sourceViewId?: string } | null {
	if (
		!modified ||
		typeof Element === 'undefined' ||
		!(target instanceof Element)
	)
		return null
	const hotspot = target.closest<HTMLElement>('[data-dc-prototype-to]')
	const canvasId = hotspot?.dataset.dcPrototypeTo
	if (!hotspot || !canvasId) return null
	const frameKey =
		hotspot.closest<HTMLElement>('[data-dc-frame]')?.dataset.dcFrame
	const separator = frameKey?.indexOf('::') ?? -1
	return {
		canvasId,
		sourceViewId:
			frameKey && separator >= 0 ? frameKey.slice(separator + 2) : undefined,
	}
}

function targetArtboard(
	items: PlacedItem[],
	hotspot: PrototypeHotspot,
): PlacedArtboard | undefined {
	const candidates = items.filter(
		(item): item is PlacedArtboard =>
			item.kind === 'artboard' && item.canvas.id === hotspot.toCanvasId,
	)
	return (
		candidates.find((item) => item.view.id === hotspot.fromViewId) ??
		candidates[0]
	)
}

/** Pure projection from registered hotspots to drawable world-space edges. */
export function resolvePrototypeGraph(
	hotspots: PrototypeHotspot[],
	items: PlacedItem[],
	measured: ReadonlyMap<string, number>,
): PrototypeGraph {
	const connections: PrototypeConnection[] = []
	const unresolved: PrototypeHotspot[] = []

	for (const hotspot of hotspots) {
		const target = targetArtboard(items, hotspot)
		if (!target) {
			unresolved.push(hotspot)
			continue
		}
		const rect = placedItemRect(target, measured)
		const targetOnRight = rect.x + rect.width / 2 >= hotspot.point.x
		connections.push({
			key: hotspot.key,
			label: hotspot.label,
			from: hotspot.point,
			to: {
				x: targetOnRight ? rect.x : rect.x + rect.width,
				y: rect.y + rect.height / 2,
			},
		})
	}

	return { connections, unresolved }
}

export function prototypeConnectionPath(
	connection: PrototypeConnection,
): string {
	const direction = connection.to.x >= connection.from.x ? 1 : -1
	const bend = Math.max(
		64,
		Math.abs(connection.to.x - connection.from.x) * 0.45,
	)
	return [
		`M ${connection.from.x} ${connection.from.y}`,
		`C ${connection.from.x + direction * bend} ${connection.from.y}`,
		`${connection.to.x - direction * bend} ${connection.to.y}`,
		`${connection.to.x} ${connection.to.y}`,
	].join(' ')
}

export function resolvePrototypeDestination(
	canvases: CanvasDefinition[],
	targetCanvasId: string,
	sourceViewId?: string,
): { canvasId: string; viewId?: string } | null {
	const canvas = canvases.find((entry) => entry.id === targetCanvasId)
	if (!canvas) return null
	const matchingView = sourceViewId
		? canvas.views.find((view) => view.id === sourceViewId)
		: undefined
	return {
		canvasId: canvas.id,
		viewId: matchingView?.id,
	}
}
