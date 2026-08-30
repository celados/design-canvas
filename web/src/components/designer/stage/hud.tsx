import { MessageSquarePlus, MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'

type AnnotateState = { active: boolean; count: number; panelOpen: boolean }

type HudProps = {
	zoom: number
	onFit: () => void
	onZoomTo: (zoom: number) => void
}

export function Hud(props: HudProps) {
	const [annotate, setAnnotate] = useState<AnnotateState>({
		active: false,
		count: 0,
		panelOpen: false,
	})

	useEffect(() => {
		const onState = (event: Event) => {
			setAnnotate((event as CustomEvent<AnnotateState>).detail)
		}
		window.addEventListener('dc:annotate-state', onState)
		return () => window.removeEventListener('dc:annotate-state', onState)
	}, [])

	return (
		<div className="dc-hud" data-dc-chrome>
			<button
				type="button"
				className="dc-hud-button"
				title="Zoom to fit (⌘0)"
				onClick={props.onFit}
			>
				Fit
			</button>
			<span className="dc-hud-divider" />
			<button
				type="button"
				className="dc-hud-button tabular-nums"
				title="Actual size (⌘1)"
				onClick={() => props.onZoomTo(1)}
			>
				{Math.round(props.zoom * 100)}%
			</button>
			<span className="dc-hud-divider" />
			<button
				type="button"
				className={`dc-hud-button ${annotate.active ? 'dc-hud-button-active' : ''}`}
				title="Annotate (C)"
				onClick={() => window.dispatchEvent(new CustomEvent('dc:annotate'))}
			>
				<MessageSquarePlus size={13} />
			</button>
			<button
				type="button"
				className={`dc-hud-button ${annotate.panelOpen ? 'dc-hud-button-active' : ''}`}
				title="Annotations panel"
				onClick={() =>
					window.dispatchEvent(new CustomEvent('dc:annotate-panel'))
				}
			>
				<MessageSquareText size={13} />
				{annotate.count > 0 ? (
					<span className="tabular-nums">{annotate.count}</span>
				) : null}
			</button>
			<span className="dc-hud-divider" />
			<button
				type="button"
				className="dc-hud-button text-neutral-500"
				title="Command palette (⌘K)"
				onClick={() => window.dispatchEvent(new CustomEvent('dc:palette'))}
			>
				⌘K
			</button>
		</div>
	)
}
