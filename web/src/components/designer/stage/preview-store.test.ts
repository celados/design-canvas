import { describe, expect, it, vi } from 'vitest'

import type { CanvasView } from '../api'
import type {
	ArtboardSnapshotConnection,
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

function resolveActive(store: ArtboardSnapshotStore): void {
	const request = store.readActive()
	if (!request) throw new Error('Expected an active capture')
	store.resolve(request, {
		src: `blob:${request.key}`,
		width: request.view.width,
		height: 900,
	})
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
})
