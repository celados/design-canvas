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

/** Registry projection used when overview LOD has replaced live DOM with pixels. */
export function resolveDeclaredPrototypeHotspots(
	items: PlacedItem[],
	measured: ReadonlyMap<string, number>,
): PrototypeHotspot[] {
	const artboards = items.filter(
		(item): item is PlacedArtboard => item.kind === 'artboard',
	)
	const representative = new Map<string, PlacedArtboard>()
	for (const artboard of artboards) {
		if (!representative.has(artboard.canvas.id))
			representative.set(artboard.canvas.id, artboard)
	}

	return artboards.flatMap((source) => {
		if (representative.get(source.canvas.id) !== source) return []
		const sourceRect = placedItemRect(source, measured)
		return (source.canvas.prototypeLinks ?? []).flatMap((link) => {
			const target = representative.get(link.to)
			if (!target) return []
			const targetRect = placedItemRect(target, measured)
			const targetOnRight =
				targetRect.x + targetRect.width / 2 >=
				sourceRect.x + sourceRect.width / 2
			return [
				{
					key: `${source.key}::${link.id}`,
					fromCanvasId: source.canvas.id,
					fromViewId: source.view.id,
					toCanvasId: link.to,
					label: link.label,
					point: {
						x: targetOnRight ? sourceRect.x + sourceRect.width : sourceRect.x,
						y: sourceRect.y + sourceRect.height / 2,
					},
				},
			]
		})
	})
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
