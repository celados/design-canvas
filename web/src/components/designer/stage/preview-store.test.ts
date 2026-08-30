import { describe, expect, it, vi } from 'vitest'

import type { CanvasView } from '../api'
import type {
	ArtboardSnapshotConnection,
	ArtboardSnapshotCache,
	ArtboardSnapshotStore,
} from './preview-store'

import { createArtboardSnapshotStore } from './preview-store'

function view(id: string): CanvasView {
	return {
		id,
		label: id,
		width: 1440,
		render: () => null,
	}
}

function connect(
	store: ArtboardSnapshotStore,
	key: string,
	priority: number,
	version: string | CanvasView = key,
): { connection: ArtboardSnapshotConnection; release: () => void } {
	const snapshotView = view(key)
	const connection = store.connect({
		key,
		version,
		view: snapshotView,
	})
	return { connection, release: connection.activate(priority) }
}

function resolveActive(store: ArtboardSnapshotStore, blob?: Blob): void {
	const request = store.readActive()
	if (!request) throw new Error('Expected an active capture')
	store.resolve(
		request,
		{
			src: `blob:${request.key}`,
			width: request.view.width,
			height: 900,
		},
		blob,
	)
}

describe('createArtboardSnapshotStore', () => {
	it('captures one artboard at a time and prioritizes current demand', () => {
		const store = createArtboardSnapshotStore()
		const first = connect(store, 'first', 100)
		const far = connect(store, 'far', 80)
		const visible = connect(store, 'visible', 1)

		expect(store.readActive()?.key).toBe('first')
		expect(far.connection.read().status).toBe('queued')
		expect(visible.connection.read().status).toBe('queued')

		resolveActive(store)

		expect(store.readActive()?.key).toBe('visible')
		expect(first.connection.read().status).toBe('ready')
	})

	it('reorders queued work when the viewport priority changes', () => {
		const store = createArtboardSnapshotStore()
		connect(store, 'active', 0)
		const first = connect(store, 'first', 1)
		const destination = connect(store, 'destination', 100)

		destination.connection.updatePriority(0)
		first.connection.updatePriority(50)
		resolveActive(store)

		expect(store.readActive()?.key).toBe('destination')
	})

	it('cancels queued work after its last consumer leaves', () => {
		const store = createArtboardSnapshotStore()
		connect(store, 'active', 0)
		const queued = connect(store, 'queued', 1)

		queued.release()
		resolveActive(store)

		expect(store.readActive()).toBeNull()
		expect(queued.connection.read().status).toBe('idle')
		expect(store.readMetrics().cancellations).toBe(1)
	})

	it('retries one transient failure before exposing a terminal failure', () => {
		const store = createArtboardSnapshotStore({ maxAttempts: 2 })
		const snapshot = connect(store, 'flaky', 0)
		const firstRequest = store.readActive()
		if (!firstRequest) throw new Error('Expected an active capture')

		store.reject(firstRequest, new Error('transient'))

		expect(store.readActive()?.attempt).toBe(2)
		expect(snapshot.connection.read().status).toBe('capturing')
		const retry = store.readActive()
		if (!retry) throw new Error('Expected a retry capture')
		store.reject(retry, new Error('persistent'))

		expect(snapshot.connection.read()).toMatchObject({
			status: 'failed',
			message: 'persistent',
		})
		expect(store.readMetrics()).toMatchObject({
			retries: 1,
			failures: 2,
			terminalFailures: 1,
		})
	})

	it('does not overlap captures after a timed-out renderer keeps working', async () => {
		let releasePending: (() => void) | undefined
		const pending = new Promise<void>((resolve) => {
			releasePending = resolve
		})
		const store = createArtboardSnapshotStore({ maxAttempts: 1 })
		const failed = connect(store, 'slow', 0)
		const queued = connect(store, 'next', 1)
		const request = store.readActive()
		if (!request) throw new Error('Expected an active capture')

		store.reject(request, new Error('timed out'), pending)

		expect(failed.connection.read().status).toBe('failed')
		expect(queued.connection.read().status).toBe('queued')
		expect(store.readActive()?.key).toBe('slow')

		releasePending?.()
		await pending
		await vi.waitFor(() => expect(store.readActive()?.key).toBe('next'))
	})

	it('keeps explicit versions stable and supersedes changed versions', () => {
		const revokeObjectURL = vi
			.spyOn(URL, 'revokeObjectURL')
			.mockImplementation(() => {})
		const store = createArtboardSnapshotStore()
		const current = connect(store, 'canvas::desktop', 0, 'revision-1')
		resolveActive(store)

		const sameVersion = connect(store, 'canvas::desktop', 0, 'revision-1')
		expect(sameVersion.connection.read().status).toBe('ready')
		expect(store.readActive()).toBeNull()

		const changed = connect(store, 'canvas::desktop', 0, 'revision-2')
		expect(changed.connection.read().status).toBe('capturing')
		expect(current.connection.read().status).toBe('idle')
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:canvas::desktop')
		revokeObjectURL.mockRestore()
	})

	it('selects the nearest queued snapshot from a 2000-artboard fixture', () => {
		const store = createArtboardSnapshotStore()
		connect(store, 'active', 0)
		for (let index = 0; index < 2000; index += 1) {
			connect(store, `artboard-${index}`, 2000 - index)
		}

		resolveActive(store)

		expect(store.readActive()?.key).toBe('artboard-1999')
		expect(store.readMetrics()).toMatchObject({
			requests: 2001,
			queued: 1999,
		})
	})

	it('restores a persistent snapshot without starting a capture', async () => {
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:restored')
		const cache: ArtboardSnapshotCache = {
			read: vi.fn().mockResolvedValue({
				blob: new Blob(['snapshot']),
				width: 480,
				height: 900,
			}),
			write: vi.fn(),
		}
		const store = createArtboardSnapshotStore({ cache })
		const snapshot = connect(store, 'cached', 0, 'revision-1')

		expect(snapshot.connection.read().status).toBe('restoring')
		expect(store.readActive()).toBeNull()
		await vi.waitFor(() => {
			expect(snapshot.connection.read()).toMatchObject({
				status: 'ready',
				preview: { src: 'blob:restored' },
			})
		})
		expect(store.readMetrics()).toMatchObject({ cacheHits: 1, captures: 0 })
		createObjectURL.mockRestore()
	})

	it('uses a pre-generated preview without cache or capture work', () => {
		const store = createArtboardSnapshotStore()
		const snapshotView = {
			...view('static'),
			preview: { src: '/previews/static.webp', width: 1440, height: 900 },
		}
		const connection = store.connect({
			key: 'static',
			version: 'revision-1',
			view: snapshotView,
		})
		connection.activate(0)

		expect(connection.read()).toMatchObject({
			status: 'ready',
			preview: { src: '/previews/static.webp' },
		})
		expect(store.readMetrics()).toMatchObject({ captures: 0, cacheHits: 0 })
	})

	it('captures after a cache miss and persists the resulting blob', async () => {
		const cache: ArtboardSnapshotCache = {
			read: vi.fn().mockResolvedValue(null),
			write: vi.fn().mockResolvedValue(undefined),
		}
		const store = createArtboardSnapshotStore({ cache })
		connect(store, 'missing', 0, 'revision-1')

		await vi.waitFor(() => expect(store.readActive()?.key).toBe('missing'))
		const blob = new Blob(['captured'])
		resolveActive(store, blob)

		expect(cache.write).toHaveBeenCalledWith('missing', 'revision-1', {
			blob,
			width: 1440,
			height: 900,
		})
		expect(store.readMetrics()).toMatchObject({
			cacheMisses: 1,
			cacheWrites: 1,
		})
	})

	it('restarts cache restoration after a strict-mode provider cleanup', async () => {
		const cache: ArtboardSnapshotCache = {
			read: vi.fn().mockResolvedValue(null),
			write: vi.fn(),
		}
		const store = createArtboardSnapshotStore({ cache })
		const connection = store.connect({
			key: 'strict',
			version: 'revision-1',
			view: view('strict'),
		})

		const release = connection.activate(0)
		release()
		store.dispose()
		connection.activate(0)

		await vi.waitFor(() => expect(store.readActive()?.key).toBe('strict'))
		expect(cache.read).toHaveBeenCalledTimes(2)
	})

	it('does not start the next capture during an interaction deferral', () => {
		vi.useFakeTimers()
		const store = createArtboardSnapshotStore()
		store.deferCaptures(500)
		const snapshot = connect(store, 'deferred', 0)

		expect(snapshot.connection.read().status).toBe('queued')
		expect(store.readActive()).toBeNull()
		vi.advanceTimersByTime(499)
		expect(store.readActive()).toBeNull()
		vi.advanceTimersByTime(1)
		expect(store.readActive()?.key).toBe('deferred')
		vi.useRealTimers()
	})

	it('delays cold-start capture before the first frame is interactive', () => {
		vi.useFakeTimers()
		let now = 0
		const store = createArtboardSnapshotStore({
			initialCaptureDelayMs: 1_200,
			now: () => now,
		})
		const snapshot = connect(store, 'cold', 0)

		expect(snapshot.connection.read().status).toBe('queued')
		expect(store.readActive()).toBeNull()
		now = 1_199
		vi.advanceTimersByTime(1_199)
		expect(store.readActive()).toBeNull()
		now = 1_200
		vi.advanceTimersByTime(1)
		expect(store.readActive()?.key).toBe('cold')
		vi.useRealTimers()
	})

	it('yields between captures instead of warming every frame back-to-back', () => {
		vi.useFakeTimers()
		let now = 0
		const store = createArtboardSnapshotStore({
			captureCooldownMs: 150,
			now: () => now,
		})
		connect(store, 'first', 0)
		connect(store, 'second', 1)

		resolveActive(store)
		expect(store.readActive()).toBeNull()
		now = 149
		vi.advanceTimersByTime(149)
		expect(store.readActive()).toBeNull()
		now = 150
		vi.advanceTimersByTime(1)
		expect(store.readActive()?.key).toBe('second')
		vi.useRealTimers()
	})
})
