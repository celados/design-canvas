import { Component, type ReactNode } from 'react'

/**
 * One broken canvas must not blank the whole stage. Catches during render of a
 * single artboard and leaves a reviewable placeholder in its place.
 */
export class ArtboardErrorBoundary extends Component<
	{ label: string; children: ReactNode },
	{ error: Error | null }
> {
	state = { error: null as Error | null }

	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	componentDidCatch(error: Error) {
		// Surface in console too — the placeholder alone hides the stack.
		console.error(`[design] artboard "${this.props.label}" crashed`, error)
	}

	render() {
		if (this.state.error) {
			return (
				<div
					className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center"
					style={{ color: '#f87171' }}
				>
					<span className="text-xs font-semibold">
						This artboard failed to render
					</span>
					<span className="max-w-80 font-mono text-[11px] break-words text-neutral-500">
						{this.state.error.message}
					</span>
				</div>
			)
		}
		return this.props.children
	}
}
