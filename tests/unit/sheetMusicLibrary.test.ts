import assert from "node:assert/strict"
import test from "node:test"
import { IDBFactory } from "fake-indexeddb"
import { addStroke, emptyInkPages, type Stroke } from "../../src/common/ink.ts"
import {
  type NewSheet,
  openSheetMusicLibrary,
} from "../../src/common/sheetMusicLibrary.ts"

const stroke: Stroke = {
  tool: "pen",
  color: "#17130f",
  width: 0.004,
  points: [0.1, 0.2, 0.3, 0.4],
}

function sheet(name: string, pageCount = 2): NewSheet {
  return {
    name,
    kind: "pdf",
    mimeType: "application/pdf",
    size: 3,
    pageCount,
    thumbnail: undefined,
    file: new Blob(["pdf"], { type: "application/pdf" }),
  }
}

function createLibrary() {
  let time = 1000
  let id = 0
  const factory = new IDBFactory()
  const open = () =>
    openSheetMusicLibrary(
      factory,
      () => time,
      () => `sheet-${++id}`,
    )

  return {
    library: open(),
    reopen: open,
    advanceTime: () => {
      time += 1000
    },
  }
}

test("added sheets keep their file and are listed newest first", async () => {
  const { library, advanceTime } = createLibrary()

  const first = await library.add(sheet("Etude.pdf"))
  advanceTime()
  const second = await library.add(sheet("Nocturne.pdf"))

  assert.deepEqual(
    (await library.list()).map((record) => record.name),
    ["Nocturne.pdf", "Etude.pdf"],
  )
  assert.deepEqual(await library.get(first.id), first)
  assert.equal(await (await library.getFile(second.id))?.text(), "pdf")
})

test("new sheets start without ink on every page", async () => {
  const { library } = createLibrary()
  const record = await library.add(sheet("Etude.pdf", 3))

  assert.deepEqual(await library.getInk(record.id), [[], [], []])
  assert.equal(await library.getInk("missing"), undefined)
})

test("saved ink survives reopening and moves the sheet to the top", async () => {
  const { library, reopen, advanceTime } = createLibrary()
  const first = await library.add(sheet("Etude.pdf"))
  advanceTime()
  await library.add(sheet("Nocturne.pdf"))
  advanceTime()

  const ink = addStroke(emptyInkPages(2), 1, stroke)
  await library.saveInk(first.id, ink)

  const reopened = reopen()
  assert.deepEqual(await reopened.getInk(first.id), ink)
  assert.deepEqual(
    (await reopened.list()).map((record) => record.name),
    ["Etude.pdf", "Nocturne.pdf"],
  )
  assert.equal((await reopened.get(first.id))?.updatedAt, 3000)
})

test("removing a sheet deletes its file and ink", async () => {
  const { library } = createLibrary()
  const record = await library.add(sheet("Etude.pdf"))
  await library.saveInk(record.id, addStroke(emptyInkPages(2), 0, stroke))

  await library.remove(record.id)

  assert.deepEqual(await library.list(), [])
  assert.equal(await library.getFile(record.id), undefined)
  assert.equal(await library.getInk(record.id), undefined)
})

test("saving ink for a deleted sheet does not bring it back", async () => {
  const { library } = createLibrary()
  const record = await library.add(sheet("Etude.pdf"))
  await library.remove(record.id)

  await library.saveInk(record.id, addStroke(emptyInkPages(2), 0, stroke))

  assert.deepEqual(await library.list(), [])
  assert.equal(await library.getInk(record.id), undefined)
})
