import { useCallback, useMemo, useState } from 'react'

import { useDesignerPages } from '../context'
import { useDesignNavigate } from '../nav'
import { resolvePrototypeDestination } from '../prototype'
import { layoutFlow } from '../stage/layout'
import { Stage } from '../stage/stage'

export function FlowPage() {
	const canvases = useDesignerPages()
	const navigate = useDesignNavigate()
	const [measured, setMeasured] = useState<ReadonlyMap<string, number>>(
		new Map(),
	)
	const items = useMemo(() => layoutFlow(canvases), [canvases])

	const onMeasure = useCallback((key: string, height: number) => {
		setMeasured((current) => {
			const previous = current.get(key)
			if (previous !== undefined && Math.abs(previous - height) <= 1)
				return current
			const next = new Map(current)
			next.set(key, height)
			return next
		})
	}, [])

	const onPrototypeNavigate = useCallback(
		(targetCanvasId: string, sourceViewId?: string) => {
			const destination = resolvePrototypeDestination(
				canvases,
				targetCanvasId,
				sourceViewId,
			)
			if (!destination) return
			navigate(`/_design/c/${destination.canvasId}`, {
				search: destination.viewId ? { view: destination.viewId } : {},
			})
		},
		[canvases, navigate],
	)

	return (
		<Stage
			items={items}
			measured={measured}
			onMeasure={onMeasure}
			fitKey="prototype-flow"
			showPrototypeConnections
			onPrototypeNavigate={onPrototypeNavigate}
			artboardMode="adaptive"
		/>
	)
}
