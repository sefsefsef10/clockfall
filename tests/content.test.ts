import assert from 'node:assert/strict'
import test from 'node:test'
import { maps, gates, scripts, validateContent } from '../src/content/index.ts'
import { SOLID_TILES, TILE } from '../src/const.ts'
import { createField, tickField } from '../src/systems/field.ts'
import { newGame } from '../src/systems/save.ts'
import type { GameMap, Npc } from '../src/types.ts'

test('all campaign content references and map placements validate', () => {
  assert.doesNotThrow(validateContent)
})

function visible(npc: Npc, flags: Record<string, boolean>): boolean {
  return (!npc.requires || flags[npc.requires] === true) && (!npc.unless || flags[npc.unless] !== true)
}

function reachable(map: GameMap, x: number, y: number, flags: Record<string, boolean>): Set<string> {
  const seen = new Set<string>()
  const queue = [[x, y]]
  for (let i = 0; i < queue.length; i++) {
    const [tx, ty] = queue[i]
    const key = `${tx},${ty}`
    const tile = map.rows[ty]?.[tx]
    if (!tile || SOLID_TILES.includes(tile) || seen.has(key)) continue
    if (map.npcs.some(npc => npc.x === tx && npc.y === ty && visible(npc, flags))) continue
    seen.add(key)
    queue.push([tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1])
  }
  return seen
}

test('the garden remains reachable and has one speaker through every quest stage', () => {
  const stages = [{}, { seed_heard: true }, { seed_heard: true, seed_planted: true },
    { seed_planted: true, seed_seen: true }, { seed_planted: true, seed_seen: true, seed_claimed: true }]
  for (const flags of stages) {
    for (const gate of gates.filter(gate => gate.map !== 'dial')) {
      const map = maps[gate.map]
      const speakers = map.npcs.filter(npc => npc.x === 7 && npc.y === 16 && visible(npc, flags))
      assert.ok(speakers.length <= 1, `${map.id}: overlapping garden speakers`)
      const tiles = reachable(map, gate.x, gate.y, flags)
      if (speakers.length) {
        assert.ok(['6,16', '8,16', '7,15', '7,17'].some(key => tiles.has(key)), `${map.id}: inaccessible garden`)
      }
    }
  }
})

test('garden interaction switches from reward script to ordinary dialogue after claiming', () => {
  const save = newGame()
  save.map = 'ashspire'
  save.flags = { seed_planted: true }
  save.x = 7.5 * TILE
  save.y = 17.5 * TILE
  save.facing = 'up'
  const input = { x: 0, y: 0, run: false, confirm: true, cancel: false, menu: false, rewind: false }
  const field = createField(save)
  const events = tickField(field, save, input, 0)
  assert.ok(events.some(event => event.type === 'script' && event.id === 'seed_reward'))
  save.flags.seed_claimed = true
  const after = tickField(field, save, input, 0)
  assert.ok(after.some(event => event.type === 'lines'))
  assert.ok(!after.some(event => event.type === 'script' && event.id === 'seed_reward'))
})

test('optional garden scripts never replace the campaign objective or start required battles', () => {
  for (const [id, steps] of Object.entries(scripts)) {
    if (!id.startsWith('seed_')) continue
    assert.ok(!steps.some(step => step.op === 'obj' || step.op === 'battle' || step.op === 'warp'), id)
  }
})
