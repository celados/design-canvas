import type { DesignerPage } from './api'
import type {
	ArtboardSnapshotCache,
	ArtboardSnapshotProvider as ArtboardSnapshotProviderValue,
} from './stage/preview-store'

import { DesignerProvider } from './context'
import { ArtboardSnapshotProvider } from './stage/preview'
import { DesignShell } from './ui/shell'

export type DesignerProps = {
	pages: DesignerPage[]
	snapshotProvider?: ArtboardSnapshotProviderValue
	snapshotCache?: ArtboardSnapshotCache | null
}

export function Designer(props: DesignerProps) {
	return (
		<DesignerProvider pages={props.pages}>
			<ArtboardSnapshotProvider
				provider={props.snapshotProvider}
				cache={props.snapshotCache}
			>
				<DesignShell />
			</ArtboardSnapshotProvider>
		</DesignerProvider>
	)
}
