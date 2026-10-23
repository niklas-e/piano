import assert from "node:assert/strict"
import test from "node:test"
import {
  type PersistableStorage,
  requestPersistentStorage,
} from "../../src/common/persistentStorage.ts"

test("persistent storage is not requested outside an installed app", async () => {
  const storage = fakeStorage({ persisted: false, persistResult: true })

  assert.equal(await requestPersistentStorage(false, storage), false)
  assert.equal(storage.persistCalls, 0)
})

test("persistent storage is requested once installed", async () => {
  const storage = fakeStorage({ persisted: false, persistResult: true })

  assert.equal(await requestPersistentStorage(true, storage), true)
  assert.equal(storage.persistCalls, 1)
})

test("already persisted storage is not requested again", async () => {
  const storage = fakeStorage({ persisted: true, persistResult: true })

  assert.equal(await requestPersistentStorage(true, storage), true)
  assert.equal(storage.persistCalls, 0)
})

test("missing or failing storage APIs are ignored", async () => {
  const failing: PersistableStorage = {
    persisted: () => Promise.reject(new Error("unsupported")),
    persist: () => Promise.reject(new Error("unsupported")),
  }

  assert.equal(await requestPersistentStorage(true, undefined), false)
  assert.equal(await requestPersistentStorage(true, failing), false)
})

function fakeStorage(options: { persisted: boolean; persistResult: boolean }) {
  const storage = {
    persistCalls: 0,
    persisted: () => Promise.resolve(options.persisted),
    persist: () => {
      storage.persistCalls += 1
      return Promise.resolve(options.persistResult)
    },
  }

  return storage
}
