import type {
	ArtboardSnapshotDescriptor as CoreArtboardSnapshotDescriptor,
	ArtboardSnapshotProvider as CoreArtboardSnapshotProvider,
	ArtboardSnapshotRequest as CoreArtboardSnapshotRequest,
	ArtboardSnapshotStore as CoreArtboardSnapshotStore,
	ArtboardSnapshotVersion as CoreArtboardSnapshotVersion,
	StoreOptions,
} from '@celados/design-canvas-core/snapshot-store'

import { createArtboardSnapshotStore as createCoreSnapshotStore } from '@celados/design-canvas-core/snapshot-store'

import type { CanvasView } from '../api'

export type {
	ArtboardPreview,
	ArtboardPreviewState,
	ArtboardSnapshotCache,
	ArtboardSnapshotConnection,
	ArtboardSnapshotMetrics,
	CachedArtboardSnapshot,
	StoreOptions,
} from '@celados/design-canvas-core/snapshot-store'

export type ArtboardSnapshotVersion = CoreArtboardSnapshotVersion<CanvasView>
export type ArtboardSnapshotDescriptor =
	CoreArtboardSnapshotDescriptor<CanvasView>
export type ArtboardSnapshotRequest = CoreArtboardSnapshotRequest<CanvasView>
export type ArtboardSnapshotProvider = CoreArtboardSnapshotProvider<CanvasView>
export type ArtboardSnapshotStore = CoreArtboardSnapshotStore<CanvasView>

export function createArtboardSnapshotStore(
	options: StoreOptions = {},
): ArtboardSnapshotStore {
	return createCoreSnapshotStore<CanvasView>(options)
}
