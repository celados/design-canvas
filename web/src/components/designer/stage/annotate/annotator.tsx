import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasDefinition } from '../../api'
import type { Annotation, AnnotationTarget } from './model'

import { useStageApi, useStageCamera } from '../stage'
import { installSourceCapture } from './capture'
import { annotationsToMarkdown } from './markdown'
import {
	loadAnnotations,
	mergeAnnotations,
	parseAnnotations,
	saveAnnotations,
} from './model'
import { captureTarget, resolveTarget } from './resolve'

type Draft = {
	target: AnnotationTarget
	viewId: string
}

/** Screen-space rect relative to the stage container. */
type Highlight = {
	x: number
	y: number
	width: number
	height: number
}

const FRAME_ATTR = 'data-dc-frame'

function isEditable(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target.isContentEditable)
	)
}

function parseFrameKey(
	key: string,
): { canvasId: string; viewId: string } | null {
	const separator = key.indexOf('::')
	if (separator < 0) return null
	return { canvasId: key.slice(0, separator), viewId: key.slice(separator + 2) }
}

export function Annotator(props: {
	canvas: CanvasDefinition
	containerRef: RefObject<HTMLDivElement | null>
}) {
	const { canvas, containerRef } = props
	const { screenToWorld, flyTo } = useStageApi()
	const camera = useStageCamera()

	const [active, setActive] = useState(false)
	const [panelOpen, setPanelOpen] = useState(false)
	const [annotations, setAnnotations] = useState<Annotation[]>([])
	const [draft, setDraft] = useState<Draft | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [highlight, setHighlight] = useState<Highlight | null>(null)
	const [copied, setCopied] = useState(false)

	// Capture runs at host bootstrap in the template; installing here too keeps
	// the layer correct in hosts that forget — later installs are no-ops.
	useEffect(() => {
		installSourceCapture()
	}, [])

	// Crosshair affordance while annotating.
	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		if (active) container.dataset.annotating = ''
		else delete container.dataset.annotating
	}, [active, containerRef])

	// Load + re-resolve anchors against the live DOM (elements move between
	// sessions; stored world coords are the stale fallback).
	useEffect(() => {
		const loaded = loadAnnotations(canvas.id)
		if (loaded.length === 0) {
			setAnnotations([])
			return
		}
		const timer = setTimeout(() => {
			const next = loaded.map((annotation) => {
				const frame = document.querySelector<HTMLElement>(
					`[${FRAME_ATTR}="${annotation.canvasId}::${annotation.viewId}"]`,
				)
				if (!frame) return annotation
				const element = resolveTarget(annotation.target, frame)
				if (!element) return annotation
				const rect = element.getBoundingClientRect()
				const anchor = screenToWorld(rect.left + 2, rect.top + 2)
				return {
					...annotation,
					target: { ...annotation.target, worldX: anchor.x, worldY: anchor.y },
				}
			})
			setAnnotations(next)
			saveAnnotations(canvas.id, next)
		}, 300)
		return () => clearTimeout(timer)
	}, [canvas.id, screenToWorld])

	const sorted = useMemo(
		() => [...annotations].sort((a, b) => a.createdAt - b.createdAt),
		[annotations],
	)

	const persist = useCallback(
		(next: Annotation[]) => {
			setAnnotations(next)
			saveAnnotations(canvas.id, next)
		},
		[canvas.id],
	)

	// HUD mirrors annotator state through a DOM event so the pieces stay
	// decoupled across lazy chunks.
	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent('dc:annotate-state', {
				detail: { active, count: annotations.length, panelOpen },
			}),
		)
	}, [active, annotations.length, panelOpen])

	const copyMarkdown = useCallback(async () => {
		const markdown = annotationsToMarkdown(
			canvas,
			annotations,
			window.location.href,
		)
		try {
			await navigator.clipboard.writeText(markdown)
			setCopied(true)
			setTimeout(() => setCopied(false), 1600)
		} catch {
			console.warn('[design] clipboard write failed')
		}
	}, [canvas, annotations])

	// Export writes a review artifact that can be committed or shared; import
	// merges non-destructively so two reviewers' files combine.
	const exportJson = useCallback(() => {
		const blob = new Blob([JSON.stringify(annotations, null, '\t')], {
			type: 'application/json',
		})
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `review-${canvas.id}.json`
		anchor.click()
		URL.revokeObjectURL(url)
	}, [canvas.id, annotations])

	const fileInputRef = useRef<HTMLInputElement>(null)
	// One-shot import feedback; null = nothing to show.
	const [importedCount, setImportedCount] = useState<number | null>(null)
	const importJson = useCallback(
		async (file: File) => {
			try {
				const incoming = parseAnnotations(JSON.parse(await file.text()))
				persist(mergeAnnotations(sorted, incoming))
				setImportedCount(incoming.length)
				setTimeout(() => setImportedCount(null), 2500)
			} catch {
				console.warn('[design] annotation import failed to parse')
			}
		},
		[sorted, persist],
	)

	// Global commands: HUD buttons, palette actions, keyboard.
	useEffect(() => {
		const onToggle = () => setActive((current) => !current)
		const onPanel = () => setPanelOpen((current) => !current)
		const onCopy = () => void copyMarkdown()
		const onKeyDown = (event: KeyboardEvent) => {
			if (isEditable(event.target)) return
			if (event.metaKey || event.ctrlKey || event.altKey) return
			if (event.key === 'c') setActive((current) => !current)
		}
		window.addEventListener('dc:annotate', onToggle)
		window.addEventListener('dc:annotate-panel', onPanel)
		window.addEventListener('dc:annotate-copy', onCopy)
		window.addEventListener('keydown', onKeyDown)
		return () => {
			window.removeEventListener('dc:annotate', onToggle)
			window.removeEventListener('dc:annotate-panel', onPanel)
			window.removeEventListener('dc:annotate-copy', onCopy)
			window.removeEventListener('keydown', onKeyDown)
		}
	}, [copyMarkdown])

	// Escape peels state innermost-first: composer, then annotate mode.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			if (draft || editingId) {
				setDraft(null)
				setEditingId(null)
			} else if (active) {
				setActive(false)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [draft, editingId, active])

	// Hover highlight + click-to-pin, capture phase so annotation wins over
	// artboard content interactions; stage pan only listens for non-frame
	// targets, so background drag still pans while annotating.
	useEffect(() => {
		const container = containerRef.current
		if (!container || !active) return

		const frameOf = (
			target: EventTarget | null,
		): { frame: HTMLElement; el: Element } | null => {
			if (!(target instanceof Element)) return null
			const frame = target.closest<HTMLElement>(`[${FRAME_ATTR}]`)
			if (!frame || !container.contains(frame)) return null
			return { frame, el: target }
		}

		const onMove = (event: PointerEvent) => {
			const hit = frameOf(event.target)
			if (!hit) {
				setHighlight(null)
				return
			}
			const containerRect = container.getBoundingClientRect()
			const rect = hit.el.getBoundingClientRect()
			setHighlight({
				x: rect.left - containerRect.left,
				y: rect.top - containerRect.top,
				width: rect.width,
				height: rect.height,
			})
		}

		const onDown = (event: PointerEvent) => {
			const hit = frameOf(event.target)
			if (!hit) return
			event.preventDefault()
			event.stopPropagation()
			const parsed = parseFrameKey(hit.frame.getAttribute(FRAME_ATTR) ?? '')
			if (!parsed || parsed.canvasId !== canvas.id) return
			setDraft({
				target: captureTarget(hit.el, hit.frame, screenToWorld),
				viewId: parsed.viewId,
			})
			setEditingId(null)
			setHighlight(null)
		}

		// Canceling pointerdown does not stop React's delegated onClick or anchor
		// navigation — clicking a CTA to annotate it must never fire page behavior.
		// window capture runs before the React root's delegated capture listeners.
		// Non-frame clicks (composer, panel, navigator) pass through untouched.
		const onClick = (event: MouseEvent) => {
			if (!frameOf(event.target)) return
			event.preventDefault()
			event.stopPropagation()
			event.stopImmediatePropagation()
		}

		container.addEventListener('pointermove', onMove, true)
		container.addEventListener('pointerdown', onDown, true)
		window.addEventListener('click', onClick, true)
		return () => {
			container.removeEventListener('pointermove', onMove, true)
			container.removeEventListener('pointerdown', onDown, true)
			window.removeEventListener('click', onClick, true)
		}
	}, [active, canvas.id, containerRef, screenToWorld])

	const submitDraft = useCallback(
		(comment: string) => {
			const trimmed = comment.trim()
			if (!trimmed) return
			if (editingId) {
				persist(
					sorted.map((annotation) =>
						annotation.id === editingId
							? { ...annotation, comment: trimmed }
							: annotation,
					),
				)
			} else if (draft) {
				persist([
					...sorted,
					{
						id: crypto.randomUUID(),
						canvasId: canvas.id,
						viewId: draft.viewId,
						comment: trimmed,
						createdAt: Date.now(),
						target: draft.target,
					},
				])
			}
			setDraft(null)
			setEditingId(null)
			setPanelOpen(true)
		},
		[draft, editingId, sorted, persist, canvas.id],
	)

	const remove = useCallback(
		(id: string) =>
			persist(sorted.filter((annotation) => annotation.id !== id)),
		[sorted, persist],
	)

	// Everything the annotator renders lives in screen space (outside the
	// transformed world plane); pins convert stored world anchors per frame.
	const worldToScreen = (wx: number, wy: number) => ({
		x: wx * camera.zoom + camera.x,
		y: wy * camera.zoom + camera.y,
	})

	const editingAnnotation = editingId
		? sorted.find((a) => a.id === editingId)
		: undefined
	const composerTarget = draft?.target ?? editingAnnotation?.target
	const composerPos = composerTarget
		? worldToScreen(composerTarget.worldX, composerTarget.worldY)
		: null

	return (
		<>
			{active && highlight ? (
				<div
					className="dc-highlight"
					style={{
						left: highlight.x,
						top: highlight.y,
						width: highlight.width,
						height: highlight.height,
					}}
				/>
			) : null}

			{sorted.map((annotation, index) => {
				const pos = worldToScreen(
					annotation.target.worldX,
					annotation.target.worldY,
				)
				return (
					<button
						key={annotation.id}
						type="button"
						className="dc-pin"
						style={{ left: pos.x, top: pos.y }}
						title={annotation.target.label}
						onClick={(event) => {
							event.stopPropagation()
							setEditingId(annotation.id)
							setDraft(null)
						}}
						onPointerDown={(event) => event.stopPropagation()}
					>
						{index + 1}
					</button>
				)
			})}

			{composerTarget && composerPos ? (
				<Composer
					key={editingId ?? 'draft'}
					x={composerPos.x}
					y={composerPos.y}
					initial={editingAnnotation?.comment ?? ''}
					label={composerTarget.label}
					sourceLoc={composerTarget.sourceLoc}
					onSubmit={submitDraft}
					onCancel={() => {
						setDraft(null)
						setEditingId(null)
					}}
				/>
			) : null}

			{panelOpen ? (
				<aside
					className="dc-anno-panel dc-scroll"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold tracking-wide text-neutral-400 uppercase">
							Annotations · {sorted.length}
						</span>
						<button
							type="button"
							className="dc-icon-button"
							title="Close panel"
							onClick={() => setPanelOpen(false)}
						>
							×
						</button>
					</div>
					{sorted.length === 0 ? (
						<p className="px-1 py-4 text-xs leading-5 text-neutral-500">
							Press <kbd className="dc-kbd">C</kbd> to enter annotate mode, then
							click any element on an artboard.
						</p>
					) : (
						<div className="flex flex-col gap-1">
							{sorted.map((annotation, index) => (
								<div key={annotation.id} className="dc-anno-row">
									<button
										type="button"
										className="min-w-0 flex-1 text-left"
										title="Fly to pin"
										onClick={() =>
											flyTo({
												x: annotation.target.worldX - 40,
												y: annotation.target.worldY - 40,
												width: 80,
												height: 80,
											})
										}
									>
										<div className="flex items-center gap-2">
											<span className="dc-pin-static">{index + 1}</span>
											<span className="min-w-0 truncate text-xs font-semibold text-neutral-200">
												{annotation.target.label}
											</span>
										</div>
										<div className="mt-1 truncate font-mono text-[10.5px] text-neutral-500">
											{annotation.target.sourceLoc ??
												annotation.target.selector}
										</div>
										<div className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-400">
											{annotation.comment}
										</div>
									</button>
									<div className="flex shrink-0 flex-col gap-1">
										<button
											type="button"
											className="dc-icon-button"
											title="Edit comment"
											onClick={() => {
												setEditingId(annotation.id)
												setDraft(null)
											}}
										>
											✎
										</button>
										<button
											type="button"
											className="dc-icon-button"
											title="Delete"
											onClick={() => remove(annotation.id)}
										>
											×
										</button>
									</div>
								</div>
							))}
						</div>
					)}
					<button
						type="button"
						className="dc-button mt-2 w-full justify-center"
						disabled={sorted.length === 0}
						onClick={copyMarkdown}
						data-annotate-copy
					>
						{copied ? 'Copied ✓' : 'Copy Markdown'}
					</button>
					<div className="mt-1 flex gap-1">
						<button
							type="button"
							className="dc-button flex-1 justify-center"
							disabled={sorted.length === 0}
							title="Download annotations as JSON (committable review artifact)"
							onClick={exportJson}
						>
							Export
						</button>
						<button
							type="button"
							className="dc-button flex-1 justify-center"
							title="Merge annotations from an exported JSON file"
							onClick={() => fileInputRef.current?.click()}
						>
							Import
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json,.json"
							hidden
							onChange={(event) => {
								const file = event.target.files?.[0]
								if (file) void importJson(file)
								event.target.value = ''
							}}
						/>
					</div>
					{importedCount !== null ? (
						<p className="mt-1 text-center text-[11px] text-neutral-500">
							Merged {importedCount} annotation{importedCount === 1 ? '' : 's'}
						</p>
					) : null}
				</aside>
			) : null}
		</>
	)
}

function Composer(props: {
	x: number
	y: number
	initial: string
	label: string
	sourceLoc: string | null
	onSubmit: (comment: string) => void
	onCancel: () => void
}) {
	const [value, setValue] = useState(props.initial)
	const areaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		areaRef.current?.focus()
	}, [])

	const left = Math.min(Math.max(12, props.x + 14), window.innerWidth - 332)
	const top = Math.min(Math.max(12, props.y + 14), window.innerHeight - 220)

	return (
		<div
			className="dc-composer"
			style={{ left, top }}
			onPointerDown={(event: ReactPointerEvent) => event.stopPropagation()}
		>
			<div className="min-w-0">
				<div className="truncate text-xs font-semibold text-neutral-200">
					{props.label}
				</div>
				{props.sourceLoc ? (
					<div className="mt-0.5 truncate font-mono text-[10.5px] text-indigo-300">
						{props.sourceLoc}
					</div>
				) : (
					<div className="mt-0.5 text-[10.5px] text-neutral-500">
						DOM position ref
					</div>
				)}
			</div>
			<textarea
				ref={areaRef}
				value={value}
				rows={3}
				placeholder="Comment for the agent…"
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
						event.preventDefault()
						props.onSubmit(value)
					}
				}}
			/>
			<div className="flex items-center justify-between">
				<span className="text-[10.5px] text-neutral-500">
					⌘⏎ submit · esc cancel
				</span>
				<div className="flex gap-1.5">
					<button
						type="button"
						className="dc-label-button"
						onClick={props.onCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						className="dc-label-button dc-composer-submit"
						onClick={() => props.onSubmit(value)}
					>
						Comment
					</button>
				</div>
			</div>
		</div>
	)
}
