import type { Camera, Rect, Size } from './camera.js'

import { rectsIntersect, visibleWorldRect } from './camera.js'

export type ArtboardLod = 'live' | 'preview'
export type ArtboardLodCandidate = { key: string; rect: Rect }
export type ArtboardRenderPlanEntry = { lod: ArtboardLod; priority: number }

const INITIAL_LIVE_ZOOM = 0.5
const ENTER_LIVE_ZOOM = 0.55
const ENTER_PREVIEW_ZOOM = 0.45
const OVERSCAN_PX = 320
const DEFAULT_LIVE_ARTBOARD_BUDGET = 4

export function selectArtboardLod(
	current: ArtboardLod | undefined,
	zoom: number,
): ArtboardLod {
	if (!current) return zoom > INITIAL_LIVE_ZOOM ? 'live' : 'preview'
	if (current === 'preview' && zoom >= ENTER_LIVE_ZOOM) return 'live'
	if (current === 'live' && zoom <= ENTER_PREVIEW_ZOOM) return 'preview'
	return current
}

export function createArtboardRenderPlan(options: {
	camera: Camera
	liveCamera?: Camera
	viewport: Size
	candidates: ArtboardLodCandidate[]
	lod: ArtboardLod
	focusKey?: string
	liveArtboardBudget?: number
}): ReadonlyMap<string, ArtboardRenderPlanEntry> {
	const { camera, candidates, focusKey, lod, viewport } = options
	const visible = visibleWorldRect(camera, viewport)
	const overscan = OVERSCAN_PX / camera.zoom
	const expanded = {
		x: visible.x - overscan,
		y: visible.y - overscan,
		width: visible.width + overscan * 2,
		height: visible.height + overscan * 2,
	}
	const centerX = visible.x + visible.width / 2
	const centerY = visible.y + visible.height / 2
	const visibleCandidates: Array<ArtboardLodCandidate & { priority: number }> =
		[]

	for (const candidate of candidates) {
		if (!rectsIntersect(candidate.rect, expanded)) continue
		const dx = candidate.rect.x + candidate.rect.width / 2 - centerX
		const dy = candidate.rect.y + candidate.rect.height / 2 - centerY
		visibleCandidates.push({ ...candidate, priority: dx * dx + dy * dy })
	}

	const plan = new Map<string, ArtboardRenderPlanEntry>(
		visibleCandidates.map((candidate) => [
			candidate.key,
			{ lod: 'preview', priority: candidate.priority },
		]),
	)
	if (lod === 'preview') return plan

	const liveCamera = options.liveCamera ?? camera
	const liveVisible = visibleWorldRect(liveCamera, viewport)
	const liveOverscan = OVERSCAN_PX / liveCamera.zoom
	const liveExpanded = {
		x: liveVisible.x - liveOverscan,
		y: liveVisible.y - liveOverscan,
		width: liveVisible.width + liveOverscan * 2,
		height: liveVisible.height + liveOverscan * 2,
	}
	const liveCenterX = liveVisible.x + liveVisible.width / 2
	const liveCenterY = liveVisible.y + liveVisible.height / 2
	const liveCandidates = visibleCandidates
		.filter((candidate) => rectsIntersect(candidate.rect, liveExpanded))
		.map((candidate) => {
			const dx = candidate.rect.x + candidate.rect.width / 2 - liveCenterX
			const dy = candidate.rect.y + candidate.rect.height / 2 - liveCenterY
			return { ...candidate, livePriority: dx * dx + dy * dy }
		})

	liveCandidates.sort((left, right) => {
		if (left.key === focusKey) return -1
		if (right.key === focusKey) return 1
		return left.livePriority - right.livePriority
	})
	const liveBudget = Math.max(
		1,
		Math.floor(options.liveArtboardBudget ?? DEFAULT_LIVE_ARTBOARD_BUDGET),
	)
	for (const candidate of liveCandidates.slice(0, liveBudget)) {
		plan.set(candidate.key, { lod: 'live', priority: candidate.priority })
	}
	return plan
}
