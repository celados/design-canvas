import type { DesignerPage } from './api'

import { DesignerProvider } from './context'
import { DesignShell } from './ui/shell'

export function Designer(props: { pages: DesignerPage[] }) {
	return (
		<DesignerProvider pages={props.pages}>
			<DesignShell />
		</DesignerProvider>
	)
}
