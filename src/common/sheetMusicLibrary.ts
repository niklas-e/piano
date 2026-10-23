import { type InkPages, parseInkPages } from "./ink.ts"

export type SheetKind = "pdf" | "image"

/** What the library keeps about an uploaded file, apart from its contents. */
export type SheetRecord = {
  id: string
  name: string
  kind: SheetKind
  mimeType: string
  size: number
  pageCount: number
  createdAt: number
  updatedAt: number
  thumbnail: Blob | undefined
}

export type NewSheet = Omit<SheetRecord, "id" | "createdAt" | "updatedAt"> & {
  file: Blob
}

export type SheetMusicLibrary = {
  /** All sheets, most recently changed first. */
  list(): Promise<SheetRecord[]>
  get(id: string): Promise<SheetRecord | undefined>
  getFile(id: string): Promise<Blob | undefined>
  getInk(id: string): Promise<InkPages | undefined>
  add(sheet: NewSheet): Promise<SheetRecord>
  saveInk(id: string, pages: InkPages): Promise<void>
  remove(id: string): Promise<void>
}

const databaseName = "piano-sheet-music"
const databaseVersion = 1

// Metadata, file contents and ink live in separate stores so that listing the
// library never has to read whole PDFs from disk.
const stores = {
  sheets: "sheets",
  files: "files",
  ink: "ink",
} as const

type StoreName = (typeof stores)[keyof typeof stores]

export function openSheetMusicLibrary(
  factory: IDBFactory = indexedDB,
  now: () => number = Date.now,
  createId: () => string = () => crypto.randomUUID(),
): SheetMusicLibrary {
  let connection: Promise<IDBDatabase> | undefined

  const database = () => {
    connection ??= openDatabase(factory).then((db) => {
      // Let a newer version of the app upgrade the schema in another tab.
      db.onversionchange = () => {
        db.close()
        connection = undefined
      }
      return db
    })
    return connection
  }

  const transact = async <T>(
    storeNames: StoreName[],
    mode: IDBTransactionMode,
    run: (transaction: IDBTransaction) => IDBRequest<T> | undefined,
  ): Promise<T | undefined> => {
    const transaction = (await database()).transaction(storeNames, mode)
    const request = run(transaction)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(request?.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Transaction aborted"))
    })
  }

  const get = async (id: string) => {
    const record = await transact<unknown>(
      [stores.sheets],
      "readonly",
      (transaction) => transaction.objectStore(stores.sheets).get(id),
    )

    return isSheetRecord(record) ? record : undefined
  }

  return {
    get,

    async list() {
      const records = await transact<unknown[]>(
        [stores.sheets],
        "readonly",
        (transaction) => transaction.objectStore(stores.sheets).getAll(),
      )

      return (records ?? [])
        .filter(isSheetRecord)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },

    async getFile(id) {
      const file = await transact<unknown>(
        [stores.files],
        "readonly",
        (transaction) => transaction.objectStore(stores.files).get(id),
      )

      return file instanceof Blob ? file : undefined
    },

    async getInk(id) {
      const [record, ink] = await Promise.all([
        get(id),
        transact<unknown>([stores.ink], "readonly", (transaction) =>
          transaction.objectStore(stores.ink).get(id),
        ),
      ])

      return record && parseInkPages(ink, record.pageCount)
    },

    async add({ file, ...details }) {
      const timestamp = now()
      const record: SheetRecord = {
        ...details,
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await transact(
        [stores.sheets, stores.files],
        "readwrite",
        (transaction) => {
          transaction.objectStore(stores.sheets).add(record)
          transaction.objectStore(stores.files).add(file, record.id)
          return undefined
        },
      )

      return record
    },

    async saveInk(id, pages) {
      await transact(
        [stores.sheets, stores.ink],
        "readwrite",
        (transaction) => {
          const sheets = transaction.objectStore(stores.sheets)
          const request = sheets.get(id)
          request.onsuccess = () => {
            const record: unknown = request.result
            // The sheet may have been deleted in another tab. Don't resurrect
            // its ink.
            if (isSheetRecord(record)) {
              sheets.put({ ...record, updatedAt: now() })
              transaction.objectStore(stores.ink).put(pages, id)
            }
          }
          return undefined
        },
      )
    },

    async remove(id) {
      await transact(
        [stores.sheets, stores.files, stores.ink],
        "readwrite",
        (transaction) => {
          for (const store of [stores.sheets, stores.files, stores.ink]) {
            transaction.objectStore(store).delete(id)
          }
          return undefined
        },
      )
    },
  }
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion)

    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore(stores.sheets, { keyPath: "id" })
      db.createObjectStore(stores.files)
      db.createObjectStore(stores.ink)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () =>
      reject(new Error("Close other tabs of the app and try again."))
  })
}

function isSheetRecord(value: unknown): value is SheetRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "kind" in value &&
    (value.kind === "pdf" || value.kind === "image") &&
    "mimeType" in value &&
    typeof value.mimeType === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "pageCount" in value &&
    typeof value.pageCount === "number" &&
    Number.isInteger(value.pageCount) &&
    value.pageCount > 0 &&
    "createdAt" in value &&
    typeof value.createdAt === "number" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number" &&
    "thumbnail" in value &&
    (value.thumbnail === undefined || value.thumbnail instanceof Blob)
  )
}
