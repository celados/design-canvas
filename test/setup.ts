// Node 26 reserves an unusable global localStorage unless started with a file;
// use a deterministic in-memory adapter instead of coupling tests to that flag.
if (typeof window !== 'undefined') {
	const values = new Map<string, string>()
	const storage: Storage = {
		get length() {
			return values.size
		},
		clear() {
			values.clear()
		},
		getItem(key) {
			return values.get(key) ?? null
		},
		key(index) {
			return [...values.keys()][index] ?? null
		},
		removeItem(key) {
			values.delete(key)
		},
		setItem(key, value) {
			values.set(key, value)
		},
	}
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: storage,
	})
}
