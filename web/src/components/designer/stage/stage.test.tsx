import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CanvasDefinition } from '../api'
import type { ArtboardSnapshotProvider } from './preview-store'

import { ArtboardSnapshotProvider as SnapshotProvider } from './preview'
import { Stage } from './stage'

describe('Stage initial render', () => {
	it('does not mount live artboard content before viewport measurement', () => {
		const render = vi.fn(() => <div>live content</div>)
		const canvas: CanvasDefinition = {
			id: 'cold-start',
			title: 'Cold start',
			group: 'Test',
			views: [
				{
					id: 'desktop',
					label: 'Desktop',
					width: 1440,
					previewVersion: '1',
					render,
				},
			],
		}
		const provider: ArtboardSnapshotProvider = {
			connect: () => ({
				read: () => ({ status: 'idle' }),
				subscribe: () => () => {},
				activate: () => () => {},
				updatePriority: () => {},
				retry: () => {},
			}),
		}
		const html = renderToString(
			<SnapshotProvider provider={provider}>
				<Stage
					items={[
						{
							kind: 'artboard',
							key: 'cold-start::desktop',
							x: 0,
							y: 0,
							width: 1440,
							canvas,
							view: canvas.views[0]!,
						},
					]}
					measured={new Map()}
					onMeasure={() => {}}
					artboardMode="adaptive"
				/>
			</SnapshotProvider>,
		)

		expect(render).not.toHaveBeenCalled()
		expect(html).toContain('dc-preview-artboard')
	})
})
