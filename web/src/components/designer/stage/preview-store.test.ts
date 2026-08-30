import { describe, expect, it } from 'vitest'

import type { CanvasView } from '../api'

import { createArtboardPreviewStore } from './preview-store'

function view(id: string): CanvasView {
	return {
		id,
		label: id,
		width: 1440,
		render: () => null,
	}
}

describe('createArtboardPreviewStore', () => {
	it('captures one artboard at a time and advances the queue', () => {
		const store = createArtboardPreviewStore()
		const first = view('first')
		const second = view('second')

		store.request('canvas::first', first)
		store.request('canvas::second', second)

		const firstRequest = store.readActive()
		expect(firstRequest?.key).toBe('canvas::first')
		expect(store.read('canvas::first', first).status).toBe('capturing')
		expect(store.read('canvas::second', second).status).toBe('queued')

		if (!firstRequest)
			throw new Error('Expected the first capture to be active')
		store.resolve(firstRequest, {
			src: 'blob:first',
			width: 1440,
			height: 900,
		})

		expect(store.read('canvas::first', first)).toMatchObject({
			status: 'ready',
			preview: { height: 900 },
		})
		expect(store.readActive()?.key).toBe('canvas::second')
		expect(store.read('canvas::second', second).status).toBe('capturing')
	})

	it('discards stale work when the render source changes', () => {
		const store = createArtboardPreviewStore()
		const oldView = view('old')
		const nextView = view('next')

		store.request('canvas::desktop', oldView)
		const staleRequest = store.readActive()
		store.request('canvas::desktop', nextView)

		expect(store.read('canvas::desktop', oldView).status).toBe('idle')
		expect(store.read('canvas::desktop', nextView).status).toBe('queued')
		if (!staleRequest) throw new Error('Expected a stale capture to be active')
		store.reject(staleRequest, new Error('stale'))

		expect(store.readActive()?.view).toBe(nextView)
		expect(store.read('canvas::desktop', nextView).status).toBe('capturing')
	})
})
