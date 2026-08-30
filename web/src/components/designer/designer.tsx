import type { DesignerPage } from './api'

import { DesignerProvider } from './context'
import { ArtboardSnapshotProvider } from './stage/preview'
import { DesignShell } from './ui/shell'

export function Designer(props: { pages: DesignerPage[] }) {
	return (
		<DesignerProvider pages={props.pages}>
			<ArtboardSnapshotProvider>
				<DesignShell />
			</ArtboardSnapshotProvider>
		</DesignerProvider>
	)
}
