import { useCallback, useMemo, useRef, useState, useEffect } from 'react'

import type { Camera } from '../stage/camera'

import { useDesignerPages } from '../context'
import { useDesignNavigate, useDesignSearch } from '../nav'
import { layoutWall } from '../stage/layout'
import { Stage } from '../stage/stage'

export function WallPage() {
	const canvases = useDesignerPages()
	const search = useDesignSearch()
	const navigate = useDesignNavigate()

	const [measured, setMeasured] = useState<ReadonlyMap<string, number>>(
		new Map(),
	)
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

	const items = useMemo(() => layoutWall(canvases, measured), [measured])

	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	)
	const onCameraMove = useCallback(
		(camera: Camera) => {
			clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				navigate('/_design/wall', {
					search: {
						x: Math.round(camera.x),
						y: Math.round(camera.y),
						z: Math.round(camera.zoom * 1000) / 1000,
					},
					replace: true,
				})
			}, 400)
		},
		[navigate],
	)
	useEffect(() => () => clearTimeout(debounceRef.current), [])

	const { x, y, z } = search
	const initialCamera =
		typeof x === 'number' && typeof y === 'number' && typeof z === 'number'
			? { x, y, zoom: z }
			: undefined

	return (
		<Stage
			items={items}
			measured={measured}
			onMeasure={onMeasure}
			initialCamera={initialCamera}
			onCameraMove={onCameraMove}
		/>
	)
}
