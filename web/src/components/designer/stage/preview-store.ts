import type { CanvasView } from '../api'

export type ArtboardPreview = {
	src: string
	width: number
	height: number
}

export type ArtboardPreviewState =
	| { status: 'idle' }
	| { status: 'queued' }
	| { status: 'capturing' }
	| { status: 'ready'; preview: ArtboardPreview }
	| { status: 'failed'; message: string }

export type ArtboardPreviewRequest = {
	id: number
	key: string
	view: CanvasView
}

export type ArtboardPreviewStore = {
	read: (key: string, view: CanvasView) => ArtboardPreviewState
	request: (key: string, view: CanvasView) => void
	subscribe: (key: string, listener: () => void) => () => void
	readActive: () => ArtboardPreviewRequest | null
	subscribeActive: (listener: () => void) => () => void
	resolve: (request: ArtboardPreviewRequest, preview: ArtboardPreview) => void
	reject: (request: ArtboardPreviewRequest, error: unknown) => void
	dispose: () => void
}

const IDLE: ArtboardPreviewState = { status: 'idle' }

type Entry = {
	view: CanvasView
	state: ArtboardPreviewState
}

export function createArtboardPreviewStore(): ArtboardPreviewStore {
	const entries = new Map<string, Entry>()
	const listeners = new Map<string, Set<() => void>>()
	const activeListeners = new Set<() => void>()
	const queue: ArtboardPreviewRequest[] = []
	let active: ArtboardPreviewRequest | null = null
	let nextId = 1

	const emit = (key: string) => {
		for (const listener of listeners.get(key) ?? []) listener()
	}

	const pump = () => {
		if (active) return false
		while (queue.length > 0) {
			const request = queue.shift()
			if (!request) return false
			const entry = entries.get(request.key)
			if (entry?.view !== request.view || entry.state.status !== 'queued') {
				continue
			}
			entry.state = { status: 'capturing' }
			active = request
			emit(request.key)
			return true
		}
		return false
	}

	const finish = (request: ArtboardPreviewRequest) => {
		if (active?.id !== request.id) return false
		active = null
		pump()
		for (const listener of activeListeners) listener()
		return true
	}

	return {
		read(key, view) {
			const entry = entries.get(key)
			return entry?.view === view ? entry.state : IDLE
		},
		request(key, view) {
			const current = entries.get(key)
			if (current?.view === view && current.state.status !== 'idle') {
				return
			}
			if (current?.state.status === 'ready') {
				URL.revokeObjectURL(current.state.preview.src)
			}
			// A changed render source supersedes queued work for the same artboard.
			// An in-flight capture is allowed to finish and will be discarded safely.
			for (let index = queue.length - 1; index >= 0; index -= 1) {
				if (queue[index]?.key === key) queue.splice(index, 1)
			}
			const request = { id: nextId, key, view }
			nextId += 1
			entries.set(key, { view, state: { status: 'queued' } })
			queue.push(request)
			emit(key)
			if (pump()) {
				for (const listener of activeListeners) listener()
			}
		},
		subscribe(key, listener) {
			const keyListeners = listeners.get(key) ?? new Set()
			keyListeners.add(listener)
			listeners.set(key, keyListeners)
			return () => {
				keyListeners.delete(listener)
				if (keyListeners.size === 0) listeners.delete(key)
			}
		},
		readActive() {
			return active
		},
		subscribeActive(listener) {
			activeListeners.add(listener)
			return () => activeListeners.delete(listener)
		},
		resolve(request, preview) {
			const current = entries.get(request.key)
			if (current?.view === request.view) {
				current.state = { status: 'ready', preview }
				emit(request.key)
			} else {
				URL.revokeObjectURL(preview.src)
			}
			finish(request)
		},
		reject(request, error) {
			const current = entries.get(request.key)
			if (current?.view === request.view) {
				current.state = {
					status: 'failed',
					message: error instanceof Error ? error.message : String(error),
				}
				emit(request.key)
			}
			finish(request)
		},
		dispose() {
			for (const entry of entries.values()) {
				if (entry.state.status === 'ready') {
					URL.revokeObjectURL(entry.state.preview.src)
				}
			}
			entries.clear()
			listeners.clear()
			activeListeners.clear()
			queue.length = 0
			active = null
		},
	}
}
