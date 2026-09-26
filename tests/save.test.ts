import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTO_KEY, SAVE_KEY } from '../src/const.ts'
import { loadAuto, loadManual, newGame, saveManual } from '../src/systems/save.ts'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null { return values.get(key) ?? null },
    setItem(key: string, value: string): void { values.set(key, value) },
    removeItem(key: string): void { values.delete(key) },
    clear(): void { values.clear() },
    key(index: number): string | null { return [...values.keys()][index] ?? null },
    get length(): number { return values.size },
  } satisfies Storage,
})

function storeManual(value: string): void {
  values.set(SAVE_KEY, value)
}

test('malformed JSON returns null without erasing the stored save', () => {
  storeManual('{broken json')

  assert.equal(loadManual(), null)
  assert.equal(values.get(SAVE_KEY), '{broken json')
})

test('unknown map and invalid party character ids are rejected', () => {
  const valid = newGame()
  storeManual(JSON.stringify({ ...valid, map: 'moon' }))
  assert.equal(loadManual(), null)

  storeManual(JSON.stringify({ ...valid, party: [{ ...valid.party[0], id: 'unknown' }] }))
  assert.equal(loadManual(), null)
})

test('non-finite and out-of-range numeric save fields are rejected', () => {
  const valid = newGame()
  const badValues: unknown[] = [
    { ...valid, x: Number.NaN },
    { ...valid, y: Number.POSITIVE_INFINITY },
    { ...valid, gold: -1 },
    { ...valid, gold: 1_000_000_001 },
    { ...valid, playtime: Number.MAX_VALUE },
    { ...valid, party: [{ ...valid.party[0], level: 100 }] },
    { ...valid, party: [{ ...valid.party[0], hp: Number.NaN }] },
  ]

  for (const bad of badValues) {
    storeManual(JSON.stringify(bad))
    assert.equal(loadManual(), null)
  }
})

test('valid save roundtrips and preserves boolean seed quest flags', () => {
  const save = newGame({ speed: 2, volume: 0.4 })
  save.flags['seed_quest_started'] = true
  save.flags['seed_quest_rewarded'] = false
  storeManual(JSON.stringify(save))

  assert.deepEqual(loadManual(), save)
})

test('auto loader rejects malformed structures safely', () => {
  values.set(AUTO_KEY, JSON.stringify({ version: 1, party: {}, map: 'leorain' }))
  assert.equal(loadAuto(), null)
})

test('older valid saves receive conservative defaults for optional data', () => {
  const save = newGame()
  const older: Record<string, unknown> = { ...save }
  delete older.settings
  delete older.flags
  delete older.inventory
  storeManual(JSON.stringify(older))

  const loaded = loadManual()
  assert.ok(loaded)
  assert.deepEqual(loaded.settings, newGame().settings)
  assert.deepEqual(loaded.flags, {})
  assert.deepEqual(loaded.inventory, newGame().inventory)
})

test('saveManual writes a loadable save', () => {
  const save = newGame()
  saveManual(save)
  assert.deepEqual(loadManual(), save)
})
