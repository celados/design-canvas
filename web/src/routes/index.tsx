import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
	return (
		<main className="grid min-h-svh place-items-center bg-neutral-950 px-6 text-neutral-100">
			<section className="max-w-xl space-y-5 text-center">
				<p className="text-sm font-medium tracking-[0.18em] text-neutral-500 uppercase">
					Celados
				</p>
				<h1 className="text-5xl font-semibold tracking-tight">Design Canvas</h1>
				<p className="text-lg leading-8 text-neutral-400">
					Review responsive product surfaces, pin references, and send
					source-linked feedback without leaving the application.
				</p>
				<Link
					className="inline-flex rounded-full bg-white px-5 py-2.5 font-medium text-neutral-950"
					to="/_design"
				>
					Open Canvas
				</Link>
			</section>
		</main>
	)
}
