import type {
	ArtboardSnapshotCache,
	CachedArtboardSnapshot,
} from './preview-store'

const DATABASE_NAME = 'design-canvas-previews'
const DATABASE_VERSION = 2
const STORE_NAME = 'snapshots'

type SnapshotRecord = CachedArtboardSnapshot & {
	id: string
	key: string
	version: string
}

function recordId(key: string, version: string): string {
	return `${key}\u0000${version}`
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.addEventListener('success', () => resolve(request.result), {
			once: true,
		})
		request.addEventListener('error', () => reject(request.error), {
			once: true,
		})
	})
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.addEventListener('complete', () => resolve(), { once: true })
		transaction.addEventListener('abort', () => reject(transaction.error), {
			once: true,
		})
		transaction.addEventListener('error', () => reject(transaction.error), {
			once: true,
		})
	})
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
		request.addEventListener(
			'upgradeneeded',
			(event) => {
				// v1 accepted compositor-white captures; discard them instead of
				// repeatedly restoring a known-invalid snapshot after this fix.
				if (
					event.oldVersion === 1 &&
					request.result.objectStoreNames.contains(STORE_NAME)
				) {
					request.result.deleteObjectStore(STORE_NAME)
				}
				if (!request.result.objectStoreNames.contains(STORE_NAME)) {
					request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
				}
			},
			{ once: true },
		)
		request.addEventListener('success', () => resolve(request.result), {
			once: true,
		})
		request.addEventListener('error', () => reject(request.error), {
			once: true,
		})
	})
}

export function createBrowserArtboardSnapshotCache():
	| ArtboardSnapshotCache
	| undefined {
	if (typeof window === 'undefined' || !('indexedDB' in globalThis))
		return undefined
	const database = openDatabase()
	// Static-preview consumers may never call read/write, so observe an eager
	// open failure here instead of leaking an unhandled rejection.
	void database.catch(() => {})
	return {
		async read(key, version) {
			const db = await database
			const transaction = db.transaction(STORE_NAME, 'readonly')
			const record = await requestResult<SnapshotRecord | undefined>(
				transaction.objectStore(STORE_NAME).get(recordId(key, version)),
			)
			return record
				? { blob: record.blob, width: record.width, height: record.height }
				: null
		},
		async write(key, version, snapshot) {
			const db = await database
			const transaction = db.transaction(STORE_NAME, 'readwrite')
			const store = transaction.objectStore(STORE_NAME)
			store.put({ ...snapshot, id: recordId(key, version), key, version })
			const cursorRequest = store.openCursor()
			cursorRequest.addEventListener('success', () => {
				const cursor = cursorRequest.result
				if (!cursor) return
				const record = cursor.value as SnapshotRecord
				if (record.key === key && record.version !== version) cursor.delete()
				cursor.continue()
			})
			await transactionDone(transaction)
		},
	}
}
