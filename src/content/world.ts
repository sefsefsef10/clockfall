import { ALLOWED_TILES, SOLID_TILES } from '../const.ts'
import type { Dir, GateDest, MapId, PuzzleDef, ShopDef } from '../types.ts'
import { characters } from './characters.ts'
import { enemies } from './enemies.ts'
import { items } from './items.ts'
import { maps } from './maps.ts'
import { scripts } from './scripts.ts'
import { techs } from './techs.ts'

export const START: { map: MapId; tileX: number; tileY: number; facing: Dir } = {
  map: 'leorain',
  tileX: 15,
  tileY: 19,
  facing: 'up',
}

export const shops: ShopDef[] = [
  {
    id: 'leorain',
    name: 'Fair Stalls',
    items: ['tonic', 'ether', 'fair-sabre', 'leather-coat'],
  },
  {
    id: 'ashspire',
    name: 'Ash Market',
    items: ['tonic-plus', 'ether', 'ash-recurve', 'travelers-mail'],
  },
  {
    id: 'crownkeep',
    name: 'Crown Armory',
    items: ['tonic-plus', 'phoenix', 'elixir', 'crown-maul', 'knight-plate'],
  },
]

export const gates: GateDest[] = [
  {
    id: 'leorain',
    label: 'Return to Leorain',
    detail: 'The fair green, and the clock that keeps the door.',
    map: 'leorain',
    x: 16,
    y: 15,
    facing: 'down',
  },
  {
    id: 'ashspire',
    label: 'To Ashspire',
    detail: 'The same fair, long after the fire.',
    map: 'ashspire',
    x: 16,
    y: 18,
    facing: 'up',
    requires: 'future_open',
    deny: 'The clock has not opened forward yet.',
  },
  {
    id: 'crownkeep',
    label: 'To Crownkeep',
    detail: 'The keep, centuries before the bell was cast.',
    map: 'crownkeep',
    x: 15,
    y: 23,
    facing: 'up',
    requires: 'past_open',
    deny: 'Crownkeep is still silent.',
  },
  {
    id: 'dial',
    label: 'Into the Sunken Dial',
    detail: 'Under the ages, where the seconds are kept.',
    map: 'dial',
    x: 18,
    y: 4,
    facing: 'down',
    requires: 'dial_open',
    deny: 'The dial stairs will not take fewer than three.',
  },
]

export const puzzles: PuzzleDef[] = [
  {
    id: 'woods-bells',
    map: 'woods',
    sequence: ['bell-dawn', 'bell-noon', 'bell-dusk'],
    successFlag: 'bells_solved',
    successScript: 'bells_ok',
    failScript: 'bells_bad',
  },
]

const MAP_IDS: MapId[] = ['leorain', 'woods', 'ashspire', 'cathedral', 'crownkeep', 'dial']

function rectHolds(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h
}

function rectInside(width: number, height: number, x: number, y: number, w: number, h: number): boolean {
  return w >= 1 && h >= 1 && x >= 0 && y >= 0 && x + w <= width && y + h <= height
}

function distToRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): number {
  let best = Number.POSITIVE_INFINITY
  for (let ty = rect.y; ty < rect.y + rect.h; ty += 1) {
    for (let tx = rect.x; tx < rect.x + rect.w; tx += 1) {
      const dist = Math.max(Math.abs(tx - x), Math.abs(ty - y))
      if (dist < best) best = dist
    }
  }
  return best
}

function awayFacing(tx: number, ty: number, rect: { x: number; y: number; w: number; h: number }): Dir {
  const cx = rect.x + (rect.w - 1) / 2
  const cy = rect.y + (rect.h - 1) / 2
  const dx = cx - tx
  const dy = cy - ty
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 'up' : 'down'
  return dx > 0 ? 'left' : 'right'
}

export function validateContent(): void {
  const problems: string[] = []
  const allowed = new Set(ALLOWED_TILES)
  const solid = new Set(SOLID_TILES)
  const characterIds = new Set(Object.keys(characters))
  const itemIds = new Set<string>()
  const techIds = new Set<string>()
  const enemyIds = new Set<string>()

  for (const item of items) {
    if (itemIds.has(item.id)) problems.push(`duplicate item id ${item.id}`)
    itemIds.add(item.id)
    for (const user of item.users ?? []) {
      if (!characterIds.has(user)) problems.push(`item ${item.id} has unknown user ${user}`)
    }
  }
  for (const tech of techs) {
    if (techIds.has(tech.id)) problems.push(`duplicate tech id ${tech.id}`)
    techIds.add(tech.id)
    if (tech.users.length === 0) problems.push(`tech ${tech.id} has no users`)
    for (const user of tech.users) {
      if (!characterIds.has(user)) problems.push(`tech ${tech.id} has unknown user ${user}`)
    }
  }
  for (const enemy of enemies) {
    if (enemyIds.has(enemy.id)) problems.push(`duplicate enemy id ${enemy.id}`)
    enemyIds.add(enemy.id)
    if (enemy.skills.length === 0) problems.push(`enemy ${enemy.id} has no skills`)
  }
  for (const character of Object.values(characters)) {
    if (!itemIds.has(character.weapon)) problems.push(`${character.id} weapon missing: ${character.weapon}`)
    if (!itemIds.has(character.armor)) problems.push(`${character.id} armor missing: ${character.armor}`)
    for (const techId of character.techs) {
      if (!techIds.has(techId)) problems.push(`${character.id} lists missing tech ${techId}`)
    }
  }

  for (const [scriptId, steps] of Object.entries(scripts)) {
    for (const step of steps) {
      if (step.op === 'battle') {
        for (const enemyId of step.enemies) {
          if (!enemyIds.has(enemyId)) problems.push(`script ${scriptId} battles missing enemy ${enemyId}`)
        }
      } else if (step.op === 'give') {
        if (!itemIds.has(step.item)) problems.push(`script ${scriptId} gives missing item ${step.item}`)
      } else if (step.op === 'requireItems') {
        for (const itemId of step.items) {
          if (!itemIds.has(itemId)) problems.push(`script ${scriptId} requires missing item ${itemId}`)
        }
      } else if (step.op === 'unlock') {
        if (!techIds.has(step.tech)) problems.push(`script ${scriptId} unlocks missing tech ${step.tech}`)
      }
    }
  }

  for (const shop of shops) {
    for (const itemId of shop.items) {
      if (!itemIds.has(itemId)) problems.push(`shop ${shop.id} sells missing item ${itemId}`)
    }
  }

  const bossScripts = new Set<string>()
  for (const [scriptId, steps] of Object.entries(scripts)) {
    if (steps.some((step) => step.op === 'battle' && step.boss === true)) bossScripts.add(scriptId)
  }

  const seenMaps = new Set<string>()
  for (const id of MAP_IDS) {
    const map = maps[id]
    if (!map) {
      problems.push(`missing map ${id}`)
      continue
    }
    seenMaps.add(id)
    if (map.id !== id) problems.push(`map key ${id} has id ${map.id}`)
    const height = map.rows.length
    const width = map.rows[0]?.length ?? 0
    if (width < 30 || height < 24) problems.push(`${id} is ${width}x${height}, need at least 30x24`)
    if (map.rows.some((row) => row.length !== width)) problems.push(`${id} is not rectangular`)
    const illegal = new Set<string>()
    for (const row of map.rows) {
      for (const ch of row) {
        if (!allowed.has(ch)) illegal.add(ch)
      }
    }
    if (illegal.size > 0) problems.push(`${id} has illegal tiles ${[...illegal].join(' ')}`)

    const walkable = (x: number, y: number): boolean => {
      const ch = map.rows[y]?.[x]
      return ch !== undefined && !solid.has(ch)
    }
    const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height

    for (const warp of map.warps) {
      if (!rectInside(width, height, warp.x, warp.y, warp.w, warp.h)) {
        problems.push(`${id} warp ${warp.id} is out of bounds`)
      } else {
        for (let ty = warp.y; ty < warp.y + warp.h; ty += 1) {
          for (let tx = warp.x; tx < warp.x + warp.w; tx += 1) {
            if (!walkable(tx, ty)) problems.push(`${id} warp ${warp.id} covers solid ${tx},${ty}`)
          }
        }
      }
      const dest = maps[warp.to]
      if (!dest) {
        problems.push(`${id} warp ${warp.id} goes to missing map ${warp.to}`)
        continue
      }
      const destH = dest.rows.length
      const destW = dest.rows[0]?.length ?? 0
      if (warp.tx < 0 || warp.ty < 0 || warp.tx >= destW || warp.ty >= destH) {
        problems.push(`${id} warp ${warp.id} destination ${warp.tx},${warp.ty} is out of bounds`)
      } else if (solid.has(dest.rows[warp.ty][warp.tx])) {
        problems.push(`${id} warp ${warp.id} destination ${warp.tx},${warp.ty} is solid`)
      }
      for (const other of dest.warps) {
        if (rectHolds(warp.tx, warp.ty, other)) {
          problems.push(`${id} warp ${warp.id} lands inside warp ${other.id}`)
        }
      }
      const returns = dest.warps.filter((other) => other.to === id && other.id !== warp.id)
      for (const back of returns) {
        const gap = distToRect(warp.tx, warp.ty, back)
        if (gap < 2) problems.push(`${id} warp ${warp.id} lands ${gap} from return warp ${back.id}`)
        const face = awayFacing(warp.tx, warp.ty, back)
        if (warp.facing !== face) {
          problems.push(`${id} warp ${warp.id} faces ${warp.facing}, away from ${back.id} is ${face}`)
        }
      }
    }

    const spot = (kind: string, spotId: string, x: number, y: number): void => {
      if (!inside(x, y)) problems.push(`${id} ${kind} ${spotId} is out of bounds`)
      else if (!walkable(x, y)) problems.push(`${id} ${kind} ${spotId} stands on solid ${map.rows[y][x]} at ${x},${y}`)
    }
    for (const npc of map.npcs) {
      spot('npc', npc.id, npc.x, npc.y)
      if (npc.script && !scripts[npc.script]) problems.push(`${id} npc ${npc.id} script missing: ${npc.script}`)
    }
    for (const enemy of map.enemies) {
      spot('enemy', enemy.instanceId, enemy.x, enemy.y)
      for (const enemyId of enemy.enemies) {
        if (!enemyIds.has(enemyId)) problems.push(`${id} enemy ${enemy.instanceId} uses missing enemy ${enemyId}`)
      }
      enemy.patrol.forEach((point, index) => spot('patrol', `${enemy.instanceId}#${index}`, point.x, point.y))
    }
    for (const chest of map.chests) {
      spot('chest', chest.id, chest.x, chest.y)
      if (chest.item && !itemIds.has(chest.item)) problems.push(`${id} chest ${chest.id} item missing: ${chest.item}`)
    }
    for (const interact of map.interacts) {
      spot('interact', interact.id, interact.x, interact.y)
      if (interact.script && !scripts[interact.script]) {
        problems.push(`${id} interact ${interact.id} script missing: ${interact.script}`)
      }
    }
    for (const trigger of map.triggers) {
      if (!rectInside(width, height, trigger.x, trigger.y, trigger.w, trigger.h)) {
        problems.push(`${id} trigger ${trigger.id} is out of bounds`)
      }
      if (!scripts[trigger.script]) problems.push(`${id} trigger ${trigger.id} script missing: ${trigger.script}`)
    }
  }
  for (const key of Object.keys(maps)) {
    if (!seenMaps.has(key)) problems.push(`unexpected map ${key}`)
  }

  const instanceIds = new Set<string>()
  for (const map of Object.values(maps)) {
    for (const enemy of map.enemies) {
      if (instanceIds.has(enemy.instanceId)) problems.push(`duplicate instance id ${enemy.instanceId}`)
      instanceIds.add(enemy.instanceId)
    }
  }

  for (const puzzle of puzzles) {
    if (!scripts[puzzle.successScript]) problems.push(`puzzle ${puzzle.id} success script missing`)
    if (!scripts[puzzle.failScript]) problems.push(`puzzle ${puzzle.id} fail script missing`)
    const map = maps[puzzle.map]
    if (!map) {
      problems.push(`puzzle ${puzzle.id} map missing`)
      continue
    }
    for (const interactId of puzzle.sequence) {
      const bell = map.interacts.find((interact) => interact.id === interactId && interact.kind === 'bell')
      if (!bell) problems.push(`puzzle ${puzzle.id} missing bell ${interactId} on ${puzzle.map}`)
    }
  }

  const startMap = maps[START.map]
  if (!startMap) problems.push('START map missing')
  else if (
    START.tileY < 0
    || START.tileX < 0
    || START.tileY >= startMap.rows.length
    || START.tileX >= (startMap.rows[0]?.length ?? 0)
    || solid.has(startMap.rows[START.tileY][START.tileX])
  ) {
    problems.push(`START ${START.tileX},${START.tileY} is out of bounds or solid`)
  }

  for (const gate of gates) {
    const map = maps[gate.map]
    if (!map) {
      problems.push(`gate ${gate.id} map missing`)
      continue
    }
    const height = map.rows.length
    const width = map.rows[0]?.length ?? 0
    if (gate.x < 0 || gate.y < 0 || gate.x >= width || gate.y >= height) {
      problems.push(`gate ${gate.id} is out of bounds`)
    } else if (solid.has(map.rows[gate.y][gate.x])) {
      problems.push(`gate ${gate.id} lands on solid ground`)
    }
    for (const warp of map.warps) {
      if (rectHolds(gate.x, gate.y, warp)) problems.push(`gate ${gate.id} lands inside warp ${warp.id}`)
    }
    for (const trigger of map.triggers) {
      if (!bossScripts.has(trigger.script)) continue
      if (rectHolds(gate.x, gate.y, trigger)) problems.push(`gate ${gate.id} lands inside boss trigger ${trigger.id}`)
    }
  }

  if (problems.length > 0) throw new Error(problems.join('\n'))
}
