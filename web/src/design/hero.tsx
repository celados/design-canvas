const NAV_LINKS = ['Product', 'Changelog', 'Docs', 'Pricing']

function Nav() {
	return (
		<header className="flex items-center justify-between px-8 py-5 sm:px-12">
			<div className="flex items-center gap-2.5">
				<span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-black text-white">
					M
				</span>
				<span className="text-[15px] font-semibold tracking-tight text-neutral-900">
					Meridian
				</span>
			</div>
			<nav className="hidden items-center gap-7 md:flex">
				{NAV_LINKS.map((link) => (
					<span key={link} className="text-sm font-medium text-neutral-500">
						{link}
					</span>
				))}
			</nav>
			<div className="flex items-center gap-3">
				<span className="hidden text-sm font-medium text-neutral-500 sm:block">
					Sign in
				</span>
				<span className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white">
					Get started
				</span>
			</div>
		</header>
	)
}

function HeroMock() {
	return (
		<div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl shadow-indigo-950/10">
			<div className="flex items-center gap-1.5 border-b border-neutral-100 px-4 py-2.5">
				<span className="size-2.5 rounded-full bg-neutral-200" />
				<span className="size-2.5 rounded-full bg-neutral-200" />
				<span className="size-2.5 rounded-full bg-neutral-200" />
				<div className="ml-3 h-5 flex-1 rounded-md bg-neutral-100" />
			</div>
			<div className="grid grid-cols-[180px_1fr] gap-0">
				<div className="flex flex-col gap-2 border-r border-neutral-100 p-4">
					{[0, 1, 2, 3, 4].map((row) => (
						<div
							key={row}
							className="h-6 rounded-md bg-neutral-100"
							style={{ opacity: 1 - row * 0.15 }}
						/>
					))}
				</div>
				<div className="flex flex-col gap-4 p-5">
					<div className="flex gap-3">
						{[0, 1, 2].map((card) => (
							<div
								key={card}
								className="flex-1 rounded-lg border border-neutral-100 p-3"
							>
								<div className="h-2 w-1/2 rounded bg-neutral-200" />
								<div className="mt-2 h-5 w-2/3 rounded bg-neutral-900/80" />
							</div>
						))}
					</div>
					<div className="flex h-36 items-end gap-1.5 rounded-lg border border-neutral-100 p-4">
						{[42, 58, 40, 66, 52, 74, 62, 88, 70, 95, 82, 100].map(
							(height, index) => (
								<div
									key={index}
									className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500 to-violet-400"
									style={{
										height: `${height}%`,
										opacity: 0.35 + (index / 12) * 0.65,
									}}
								/>
							),
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export function Hero() {
	return (
		<div className="relative min-h-full bg-white">
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
				style={{
					background:
						'radial-gradient(52% 42% at 50% 0%, rgb(99 102 241 / 0.14), transparent 70%)',
				}}
			/>
			<div className="relative">
				<Nav />
				<section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-14 text-center sm:pt-24">
					<span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
						New · Realtime collaboration is live
					</span>
					<h1 className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight text-balance text-neutral-950 sm:text-6xl">
						Design infrastructure for{' '}
						<span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
							product teams
						</span>
					</h1>
					<p className="mt-5 max-w-xl text-lg leading-8 text-pretty text-neutral-500">
						Meridian keeps every screen, token, and prototype in one canvas that
						your whole stack can read — designers, engineers, and agents alike.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<span className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
							Start designing
						</span>
						<span className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700">
							Watch the film ↗
						</span>
					</div>
					<div className="mt-12 flex items-center gap-10 text-neutral-400">
						{[
							['12k+', 'teams'],
							['99.99%', 'uptime'],
							['4.9★', 'rating'],
						].map(([value, label]) => (
							<div key={label} className="flex flex-col items-center gap-0.5">
								<span className="text-xl font-semibold tracking-tight text-neutral-900">
									{value}
								</span>
								<span className="text-xs font-medium tracking-wide uppercase">
									{label}
								</span>
							</div>
						))}
					</div>
				</section>
				<section className="mx-auto max-w-5xl px-6 pb-20">
					<HeroMock />
				</section>
			</div>
		</div>
	)
}

export function HeroMobile() {
	return (
		<div className="relative min-h-full bg-white">
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
				style={{
					background:
						'radial-gradient(60% 40% at 50% 0%, rgb(99 102 241 / 0.14), transparent 70%)',
				}}
			/>
			<div className="relative">
				<header className="flex items-center justify-between px-5 py-4">
					<div className="flex items-center gap-2">
						<span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-600 text-xs font-black text-white">
							M
						</span>
						<span className="text-sm font-semibold text-neutral-900">
							Meridian
						</span>
					</div>
					<span className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">
						Get started
					</span>
				</header>
				<section className="flex flex-col items-center px-5 pt-10 pb-12 text-center">
					<span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
						New · Realtime collaboration
					</span>
					<h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-neutral-950">
						Design infrastructure for{' '}
						<span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
							product teams
						</span>
					</h1>
					<p className="mt-4 text-base leading-7 text-pretty text-neutral-500">
						Every screen, token, and prototype in one canvas your whole stack
						can read.
					</p>
					<div className="mt-7 flex w-full flex-col gap-2.5">
						<span className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">
							Start designing
						</span>
						<span className="rounded-lg border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700">
							Watch the film ↗
						</span>
					</div>
				</section>
				<section className="px-5 pb-14">
					<HeroMock />
				</section>
			</div>
		</div>
	)
}
