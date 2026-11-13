import type {
	ArtboardSnapshotProvider as CoreArtboardSnapshotProvider,
	ArtboardSnapshotRequest as CoreArtboardSnapshotRequest,
	ArtboardSnapshotStore as CoreArtboardSnapshotStore,
	StoreOptions,
} from '@celados/design-canvas-core/snapshot-store'

import { createArtboardSnapshotStore as createCoreSnapshotStore } from '@celados/design-canvas-core/snapshot-store'

import type { CanvasView } from '../api'

export type {
	ArtboardPreviewState,
	ArtboardSnapshotCache,
	ArtboardSnapshotConnection,
	CachedArtboardSnapshot,
	StoreOptions,
} from '@celados/design-canvas-core/snapshot-store'

export type ArtboardSnapshotRequest = CoreArtboardSnapshotRequest<CanvasView>
export type ArtboardSnapshotProvider = CoreArtboardSnapshotProvider<CanvasView>
export type ArtboardSnapshotStore = CoreArtboardSnapshotStore<CanvasView>

export function createArtboardSnapshotStore(
	options: StoreOptions = {},
): ArtboardSnapshotStore {
	return createCoreSnapshotStore<CanvasView>(options)
}
