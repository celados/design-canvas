import { createContext, useContext } from 'react'

import type { Camera, Rect } from './camera'

// Three contexts with distinct invalidation rates: zoom changes rarely drive
// artboard re-renders; api callbacks never change; camera changes every frame
// during pan and is consumed only by screen-space overlays (composer, pins
// fly-to), never by Artboard.
export const StageZoomContext = createContext(1)
export const useStageZoom = () => useContext(StageZoomContext)

export type StageApiValue = {
	screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
	viewportCenterWorld: () => { x: number; y: number }
	flyTo: (rect: Rect) => void
}
export const StageApiContext = createContext<StageApiValue>({
	screenToWorld: () => ({ x: 0, y: 0 }),
	viewportCenterWorld: () => ({ x: 0, y: 0 }),
	flyTo: () => {},
})
export const useStageApi = () => useContext(StageApiContext)

export const StageCameraContext = createContext<Camera>({ x: 0, y: 0, zoom: 1 })
export const useStageCamera = () => useContext(StageCameraContext)
