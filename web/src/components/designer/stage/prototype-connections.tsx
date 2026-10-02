import { useLayoutEffect, useRef, useState } from 'react'

import type { PrototypeGraph, PrototypeHotspot } from '../prototype'
import type { PlacedArtboard, PlacedItem } from './layout'

import {
	prototypeConnectionPath,
	resolveDeclaredPrototypeHotspots,
	resolvePrototypeGraph,
} from '../prototype'

const HOTSPOT_SELECTOR = '[data-dc-prototype-to]'
const FRAME_SELECTOR = '[data-dc-frame]'

function parseFrameKey(
	key: string,
): { canvasId: string; viewId: string } | null {
	const separator = key.indexOf('::')
	if (separator < 0) return null
	return { canvasId: key.slice(0, separator), viewId: key.slice(separator + 2) }
}

export function readHotspots(
	world: HTMLElement,
	items: PlacedItem[],
): PrototypeHotspot[] {
	const artboards = new Map(
		items
			.filter((item): item is PlacedArtboard => item.kind === 'artboard')
			.map((item) => [item.key, item]),
	)

	const hotspots = new Map<string, PrototypeHotspot>()
	for (const [index, element] of [
		...world.querySelectorAll<HTMLElement>(HOTSPOT_SELECTOR),
	].entries()) {
		const frame = element.closest<HTMLElement>(FRAME_SELECTOR)
		const frameKey = frame?.dataset.dcFrame
		const targetCanvasId = element.dataset.dcPrototypeTo
		if (!frame || !frameKey || !targetCanvasId) continue
		const source = artboards.get(frameKey)
		const parsed = parseFrameKey(frameKey)
		if (!source || !parsed) continue

		const frameRect = frame.getBoundingClientRect()
		const elementRect = element.getBoundingClientRect()
		if (frameRect.width <= 0 || elementRect.width <= 0) continue
		const scale = frameRect.width / source.width
		const hotspotId =
			element.dataset.dcPrototypeId ?? `${targetCanvasId}:${index}`
		const hotspot = {
			key: `${frameKey}::${hotspotId}`,
			fromCanvasId: parsed.canvasId,
			fromViewId: parsed.viewId,
			toCanvasId: targetCanvasId,
			label: element.dataset.dcPrototypeLabel,
			point: {
				x:
					source.x +
					(elementRect.left + elementRect.width / 2 - frameRect.left) / scale,
				y:
					source.y +
					(elementRect.top + elementRect.height / 2 - frameRect.top) / scale,
			},
		}
		// A stable hotspot id describes one graph relation. List content may
		// mount the same action on several rows; each copy would duplicate the edge.
		if (!hotspots.has(hotspot.key)) hotspots.set(hotspot.key, hotspot)
	}
	return [...hotspots.values()]
}

const EMPTY_GRAPH: PrototypeGraph = { connections: [], unresolved: [] }

export function PrototypeConnections(props: {
	items: PlacedItem[]
	measured: ReadonlyMap<string, number>
}) {
	const { items, measured } = props
	const layerRef = useRef<SVGSVGElement>(null)
	const [graph, setGraph] = useState<PrototypeGraph>(EMPTY_GRAPH)

	useLayoutEffect(() => {
		const layer = layerRef.current
		const world = layer?.parentElement
		if (!layer || !world) return
		let frame = 0
		const update = () => {
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(() => {
				const live = readHotspots(world, items)
				const liveKeys = new Set(live.map((hotspot) => hotspot.key))
				const declared = resolveDeclaredPrototypeHotspots(
					items,
					measured,
				).filter((hotspot) => !liveKeys.has(hotspot.key))
				setGraph(resolvePrototypeGraph([...live, ...declared], items, measured))
			})
		}

		update()
		const mutationObserver = new MutationObserver(update)
		mutationObserver.observe(world, {
			attributes: true,
			attributeFilter: [
				'data-dc-prototype-id',
				'data-dc-prototype-label',
				'data-dc-prototype-to',
			],
			childList: true,
			subtree: true,
		})
		const resizeObserver = new ResizeObserver(update)
		for (const element of world.querySelectorAll(
			`${FRAME_SELECTOR}, ${HOTSPOT_SELECTOR}`,
		)) {
			resizeObserver.observe(element)
		}
		return () => {
			cancelAnimationFrame(frame)
			mutationObserver.disconnect()
			resizeObserver.disconnect()
		}
	}, [items, measured])

	return (
		<svg ref={layerRef} className="dc-prototype-connections" aria-hidden="true">
			<defs>
				<marker
					id="dc-prototype-arrow"
					viewBox="0 0 8 8"
					refX="7"
					refY="4"
					markerWidth="8"
					markerHeight="8"
					orient="auto-start-reverse"
				>
					<path d="M 0 0 L 8 4 L 0 8 Z" />
				</marker>
			</defs>
			{graph.connections.map((connection) => (
				<g key={connection.key}>
					<path
						className="dc-prototype-path"
						d={prototypeConnectionPath(connection)}
						markerEnd="url(#dc-prototype-arrow)"
					/>
					<circle
						className="dc-prototype-point"
						cx={connection.from.x}
						cy={connection.from.y}
						r={5}
					/>
				</g>
			))}
		</svg>
	)
}
