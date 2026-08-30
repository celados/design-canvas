import type { CanvasView } from '../api'

export type ArtboardPreview = {
	src: string
	width: number
	height: number
}

export type ArtboardPreviewState =
	| { status: 'idle' }
	| { status: 'restoring' }
	| { status: 'queued' }
	| { status: 'capturing' }
	| { status: 'ready'; preview: ArtboardPreview }
	| { status: 'failed'; message: string }

export type ArtboardSnapshotVersion = string | CanvasView

export type ArtboardSnapshotDescriptor = {
	key: string
	version: ArtboardSnapshotVersion
	view: CanvasView
}

export type ArtboardSnapshotRequest = ArtboardSnapshotDescriptor & {
	id: number
	attempt: number
}

export type ArtboardSnapshotConnection = {
	read: () => ArtboardPreviewState
	subscribe: (listener: () => void) => () => void
	activate: (priority: number) => () => void
	updatePriority: (priority: number) => void
	retry: () => void
}

/** The only interface overview renderers need; capture policy stays behind it. */
export type ArtboardSnapshotProvider = {
	connect: (
		descriptor: ArtboardSnapshotDescriptor,
	) => ArtboardSnapshotConnection
	deferCaptures?: (delayMs: number) => void
}

export type CachedArtboardSnapshot = {
	blob: Blob
	width: number
	height: number
}

export type ArtboardSnapshotCache = {
	read: (key: string, version: string) => Promise<CachedArtboardSnapshot | null>
	write: (
		key: string,
		version: string,
		snapshot: CachedArtboardSnapshot,
	) => Promise<void>
}

export type ArtboardSnapshotMetrics = {
	requests: number
	captures: number
	completed: number
	retries: number
	cancellations: number
	failures: number
	terminalFailures: number
	queued: number
	queueWaitMs: number
	maxQueueWaitMs: number
	captureMs: number
	maxCaptureMs: number
	cacheHits: number
	cacheMisses: number
	cacheWrites: number
}

export type ArtboardSnapshotStore = ArtboardSnapshotProvider & {
	readActive: () => ArtboardSnapshotRequest | null
	subscribeActive: (listener: () => void) => () => void
	resolve: (
		request: ArtboardSnapshotRequest,
		preview: ArtboardPreview,
		blob?: Blob,
	) => void
	reject: (
		request: ArtboardSnapshotRequest,
		error: unknown,
		pendingWork?: Promise<unknown>,
	) => void
	readMetrics: () => ArtboardSnapshotMetrics
	deferCaptures: (delayMs: number) => void
	dispose: () => void
}

type Entry = {
	descriptor: ArtboardSnapshotDescriptor
	state: ArtboardPreviewState
	demands: Map<number, number>
	attempts: number
	sequence: number
	queuedAt: number
	restoreToken: number
	ownsPreview: boolean
}

type ActiveCapture = {
	request: ArtboardSnapshotRequest
	startedAt: number
}

type StoreOptions = {
	cache?: ArtboardSnapshotCache
	maxAttempts?: number
	now?: () => number
	initialCaptureDelayMs?: number
	captureCooldownMs?: number
}

const IDLE: ArtboardPreviewState = { status: 'idle' }
const DEFAULT_MAX_ATTEMPTS = 2

function sameVersion(
	left: ArtboardSnapshotVersion,
	right: ArtboardSnapshotVersion,
): boolean {
	return left === right
}

function priorityOf(entry: Entry): number {
	let priority = Number.POSITIVE_INFINITY
	for (const demandPriority of entry.demands.values()) {
		priority = Math.min(priority, demandPriority)
	}
	return priority
}

export function createArtboardSnapshotStore(
	options: StoreOptions = {},
): ArtboardSnapshotStore {
	const entries = new Map<string, Entry>()
	const listeners = new Map<string, Set<() => void>>()
	const activeListeners = new Set<() => void>()
	const cache = options.cache
	const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
	const now = options.now ?? (() => performance.now())
	const captureCooldownMs = options.captureCooldownMs ?? 0
	let active: ActiveCapture | null = null
	// Give hydration and the first foreground paint a quiet window before optional
	// preview warming starts; later interaction deferrals extend the same gate.
	let deferredUntil = now() + Math.max(0, options.initialCaptureDelayMs ?? 0)
	let resumeTimer: ReturnType<typeof setTimeout> | undefined
	let nextRequestId = 1
	let nextDemandId = 1
	let nextSequence = 1
	const metrics = {
		requests: 0,
		captures: 0,
		completed: 0,
		retries: 0,
		cancellations: 0,
		failures: 0,
		terminalFailures: 0,
		queueWaitMs: 0,
		maxQueueWaitMs: 0,
		captureMs: 0,
		maxCaptureMs: 0,
		cacheHits: 0,
		cacheMisses: 0,
		cacheWrites: 0,
	}

	const emit = (key: string) => {
		for (const listener of listeners.get(key) ?? []) listener()
	}

	const emitActive = () => {
		for (const listener of activeListeners) listener()
	}

	const queue = (entry: Entry) => {
		entry.state = { status: 'queued' }
		entry.queuedAt = now()
		entry.sequence = nextSequence
		nextSequence += 1
		emit(entry.descriptor.key)
	}

	const scheduleResume = (delayMs: number) => {
		clearTimeout(resumeTimer)
		resumeTimer = setTimeout(() => {
			resumeTimer = undefined
			if (pump()) emitActive()
		}, delayMs)
	}

	const pump = (): boolean => {
		if (active) return false
		if (typeof document !== 'undefined' && document.hidden) return false
		const delayMs = deferredUntil - now()
		if (delayMs > 0) {
			scheduleResume(delayMs)
			return false
		}
		let selected: Entry | null = null
		for (const entry of entries.values()) {
			if (entry.state.status !== 'queued' || entry.demands.size === 0) continue
			if (!selected) {
				selected = entry
				continue
			}
			const priority = priorityOf(entry)
			const selectedPriority = priorityOf(selected)
			if (
				priority < selectedPriority ||
				(priority === selectedPriority && entry.sequence < selected.sequence)
			) {
				selected = entry
			}
		}
		if (!selected) return false

		selected.attempts += 1
		selected.state = { status: 'capturing' }
		const startedAt = now()
		const queueWait = Math.max(0, startedAt - selected.queuedAt)
		metrics.queueWaitMs += queueWait
		metrics.maxQueueWaitMs = Math.max(metrics.maxQueueWaitMs, queueWait)
		metrics.captures += 1
		active = {
			request: {
				...selected.descriptor,
				id: nextRequestId,
				attempt: selected.attempts,
			},
			startedAt,
		}
		nextRequestId += 1
		emit(selected.descriptor.key)
		return true
	}

	const restoreOrQueue = (entry: Entry) => {
		const version = entry.descriptor.version
		if (!cache || typeof version !== 'string') {
			queue(entry)
			return
		}
		entry.restoreToken += 1
		const restoreToken = entry.restoreToken
		entry.state = { status: 'restoring' }
		emit(entry.descriptor.key)
		void cache
			.read(entry.descriptor.key, version)
			.then((snapshot) => {
				if (
					entries.get(entry.descriptor.key) !== entry ||
					entry.restoreToken !== restoreToken ||
					entry.state.status !== 'restoring'
				) {
					return
				}
				if (entry.demands.size === 0) {
					entry.state = IDLE
					emit(entry.descriptor.key)
					return
				}
				if (snapshot) {
					entry.ownsPreview = true
					entry.state = {
						status: 'ready',
						preview: {
							src: URL.createObjectURL(snapshot.blob),
							width: snapshot.width,
							height: snapshot.height,
						},
					}
					metrics.cacheHits += 1
					emit(entry.descriptor.key)
					return
				}
				metrics.cacheMisses += 1
				queue(entry)
				if (pump()) emitActive()
			})
			.catch(() => {
				if (
					entries.get(entry.descriptor.key) !== entry ||
					entry.restoreToken !== restoreToken
				) {
					return
				}
				metrics.cacheMisses += 1
				queue(entry)
				if (pump()) emitActive()
			})
	}

	const finish = (request: ArtboardSnapshotRequest) => {
		if (active?.request.id !== request.id) return false
		const captureTime = Math.max(0, now() - active.startedAt)
		metrics.captureMs += captureTime
		metrics.maxCaptureMs = Math.max(metrics.maxCaptureMs, captureTime)
		active = null
		deferredUntil = Math.max(deferredUntil, now() + captureCooldownMs)
		pump()
		emitActive()
		return true
	}

	const replaceEntry = (descriptor: ArtboardSnapshotDescriptor): Entry => {
		const current = entries.get(descriptor.key)
		if (
			current &&
			sameVersion(current.descriptor.version, descriptor.version)
		) {
			current.descriptor = descriptor
			return current
		}
		if (current?.state.status === 'ready' && current.ownsPreview) {
			URL.revokeObjectURL(current.state.preview.src)
		}
		if (current?.state.status === 'queued' && current.demands.size > 0) {
			metrics.cancellations += 1
		}
		const entry: Entry = {
			descriptor,
			state: descriptor.view.preview
				? { status: 'ready', preview: descriptor.view.preview }
				: IDLE,
			demands: new Map(),
			attempts: 0,
			sequence: 0,
			queuedAt: 0,
			restoreToken: 0,
			ownsPreview: false,
		}
		entries.set(descriptor.key, entry)
		emit(descriptor.key)
		return entry
	}

	const store: ArtboardSnapshotStore = {
		connect(descriptor) {
			let demandId: number | null = null
			return {
				read() {
					const entry = entries.get(descriptor.key)
					return entry &&
						sameVersion(entry.descriptor.version, descriptor.version)
						? entry.state
						: IDLE
				},
				subscribe(listener) {
					const keyListeners = listeners.get(descriptor.key) ?? new Set()
					keyListeners.add(listener)
					listeners.set(descriptor.key, keyListeners)
					return () => {
						keyListeners.delete(listener)
						if (keyListeners.size === 0) listeners.delete(descriptor.key)
					}
				},
				activate(priority) {
					if (demandId !== null) return () => {}
					const entry = replaceEntry(descriptor)
					const wasUndemanded = entry.demands.size === 0
					demandId = nextDemandId
					nextDemandId += 1
					entry.demands.set(demandId, priority)
					metrics.requests += 1
					if (entry.state.status === 'idle') {
						restoreOrQueue(entry)
					} else if (entry.state.status === 'failed' && wasUndemanded) {
						entry.attempts = 0
						queue(entry)
					}
					if (entry.state.status === 'queued' && pump()) emitActive()
					const acquiredDemandId = demandId
					return () => {
						if (demandId !== acquiredDemandId) return
						demandId = null
						const current = entries.get(descriptor.key)
						if (
							!current ||
							!sameVersion(current.descriptor.version, descriptor.version)
						) {
							return
						}
						current.demands.delete(acquiredDemandId)
						if (
							current.demands.size === 0 &&
							(current.state.status === 'queued' ||
								current.state.status === 'restoring')
						) {
							current.restoreToken += 1
							current.state = IDLE
							metrics.cancellations += 1
							emit(descriptor.key)
						}
					}
				},
				updatePriority(priority) {
					if (demandId === null) return
					const entry = entries.get(descriptor.key)
					if (
						entry &&
						sameVersion(entry.descriptor.version, descriptor.version)
					) {
						entry.demands.set(demandId, priority)
					}
				},
				retry() {
					if (demandId === null) return
					const entry = entries.get(descriptor.key)
					if (
						!entry ||
						!sameVersion(entry.descriptor.version, descriptor.version) ||
						entry.state.status !== 'failed'
					) {
						return
					}
					entry.attempts = 0
					queue(entry)
					if (pump()) emitActive()
				},
			}
		},
		readActive() {
			return active?.request ?? null
		},
		subscribeActive(listener) {
			activeListeners.add(listener)
			return () => activeListeners.delete(listener)
		},
		resolve(request, preview, blob) {
			const current = entries.get(request.key)
			if (current && sameVersion(current.descriptor.version, request.version)) {
				current.ownsPreview = true
				current.state = { status: 'ready', preview }
				metrics.completed += 1
				if (cache && typeof request.version === 'string' && blob) {
					metrics.cacheWrites += 1
					void cache
						.write(request.key, request.version, {
							blob,
							width: preview.width,
							height: preview.height,
						})
						.catch(() => {})
				}
				emit(request.key)
			} else {
				URL.revokeObjectURL(preview.src)
			}
			finish(request)
		},
		reject(request, error, pendingWork) {
			const current = entries.get(request.key)
			if (current && sameVersion(current.descriptor.version, request.version)) {
				metrics.failures += 1
				if (current.demands.size > 0 && request.attempt < maxAttempts) {
					metrics.retries += 1
					queue(current)
				} else {
					current.state = {
						status: 'failed',
						message: error instanceof Error ? error.message : String(error),
					}
					metrics.terminalFailures += 1
					emit(request.key)
				}
			}
			if (pendingWork) {
				// html-to-image cannot be aborted. Keep the capture slot occupied until
				// its obsolete work settles so a timeout never creates overlap.
				void pendingWork.then(
					() => finish(request),
					() => finish(request),
				)
			} else {
				finish(request)
			}
		},
		readMetrics() {
			let queued = 0
			for (const entry of entries.values()) {
				if (entry.state.status === 'queued') queued += 1
			}
			return { ...metrics, queued }
		},
		deferCaptures(delayMs) {
			deferredUntil = Math.max(deferredUntil, now() + Math.max(0, delayMs))
			if (!active) scheduleResume(Math.max(0, deferredUntil - now()))
		},
		dispose() {
			clearTimeout(resumeTimer)
			for (const entry of entries.values()) {
				if (entry.state.status === 'ready' && entry.ownsPreview) {
					URL.revokeObjectURL(entry.state.preview.src)
				}
			}
			entries.clear()
			listeners.clear()
			activeListeners.clear()
			active = null
		},
	}

	return store
}
