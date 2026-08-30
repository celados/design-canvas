import { useMemo } from 'react'

import type { CanvasDefinition, DeviceName } from '../api'

/** Width bands mirror the viewport presets; authored widths classify by range. */
function deviceOf(width: number): DeviceName {
	if (width <= 480) return 'mobile'
	if (width <= 1000) return 'tablet'
	return 'desktop'
}

const DEVICES: readonly DeviceName[] = ['desktop', 'tablet', 'mobile']

/**
 * Per-canvas device pills. Each pill focuses artboards authored at that device
 * class via the existing `?view=` deep link. A band with several variants
 * cycles through them on repeated clicks, wrapping to fit-all; pills without
 * matching artboards are disabled so the control doubles as a "what did I
 * author" indicator.
 */
export function DeviceSwitcher(props: {
	canvas: CanvasDefinition
	activeViewId: string | undefined
	onSelect: (viewId: string | undefined) => void
}) {
	const byDevice = useMemo(() => {
		const map = new Map<DeviceName, string[]>()
		for (const device of DEVICES) map.set(device, [])
		for (const view of props.canvas.views) {
			const device = view.device ?? deviceOf(view.width)
			map.get(device)?.push(view.id)
		}
		return map
	}, [props.canvas])

	const activeDevice = props.activeViewId
		? ([...byDevice.entries()].find(([, ids]) =>
				ids.includes(props.activeViewId ?? ''),
			)?.[0] ?? null)
		: null

	return (
		<div className="dc-device-bar">
			{DEVICES.map((device) => {
				const ids = byDevice.get(device) ?? []
				const disabled = ids.length === 0
				const active = activeDevice === device
				return (
					<button
						key={device}
						type="button"
						className={`dc-chip-button ${active ? 'dc-chip-button-active' : ''}`}
						disabled={disabled}
						title={
							disabled
								? `No ${device} artboard on this canvas`
								: active && ids.length > 1
									? `Next ${device} artboard (${ids.indexOf(props.activeViewId ?? '') + 1}/${ids.length}, wraps to fit-all)`
									: `Focus ${device} artboard${ids.length > 1 ? ` (${ids.length})` : ''}`
						}
						onClick={() => {
							if (!active) {
								props.onSelect(ids[0])
							} else {
								const next = ids.indexOf(props.activeViewId ?? '') + 1
								props.onSelect(next < ids.length ? ids[next] : undefined)
							}
						}}
					>
						{device}
						{ids.length > 1 ? (
							<span className="tabular-nums opacity-60">
								{active ? `${ids.indexOf(props.activeViewId ?? '') + 1}/` : ''}
								{ids.length}
							</span>
						) : null}
					</button>
				)
			})}
		</div>
	)
}
