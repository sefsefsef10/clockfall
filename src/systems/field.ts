import type { Dir, FieldEvent, FieldState, GameMap, InputFrame, MapId, SaveData } from '../types.ts'
import { RUN_SPEED, SOLID_TILES, TILE, VIEW_H, VIEW_W, WALK_SPEED } from '../const.ts'
import { maps } from '../content/index.ts'

const SOLID = new Set(SOLID_TILES.split(''))

interface TrailPoint {
  x: number
  y: number
}

interface FieldExtra {
  trail: TrailPoint[]
  patrol: Record<string, number>
}

const extras = new WeakMap<FieldState, FieldExtra>()

function mapList(): GameMap[] {
  const value: unknown = maps
  if (Array.isArray(value)) return value as GameMap[]
  if (value && typeof value === 'object') return Object.values(value as Record<string, GameMap>)
  return []
}

function mapById(id: MapId): GameMap {
  const found = mapList().find(map => map.id === id)
  if (!found) throw new Error(`Unknown map: ${id}`)
  return found
}

export function tileAt(map: GameMap, px: number, py: number): string {
  const tx = Math.floor(px / TILE)
  const ty = Math.floor(py / TILE)
  if (ty < 0 || tx < 0 || ty >= map.rows.length || tx >= (map.rows[ty]?.length ?? 0)) return '#'
  return map.rows[ty][tx] ?? '#'
}

function shown(save: SaveData, obj: { requires?: string; unless?: string }): boolean {
  if (obj.requires && save.flags[obj.requires] !== true) return false
  if (obj.unless && save.flags[obj.unless] === true) return false
  return true
}

function dirVector(dir: Dir): { x: number; y: number } {
  if (dir === 'up') return { x: 0, y: -1 }
  if (dir === 'left') return { x: -1, y: 0 }
  if (dir === 'right') return { x: 1, y: 0 }
  return { x: 0, y: 1 }
}

function facingFrom(dx: number, dy: number, prev: Dir): Dir {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return prev
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 'down' : 'up'
  return dx > 0 ? 'right' : 'left'
}

function footTile(field: FieldState): { x: number; y: number } {
  return {
    x: Math.floor(field.x / TILE),
    y: Math.floor((field.y - 0.001) / TILE),
  }
}

function feetBlocked(map: GameMap, save: SaveData, x: number, y: number): boolean {
  const eps = 0.001
  const x0 = Math.floor((x - 5) / TILE)
  const x1 = Math.floor((x + 5 - eps) / TILE)
  const y0 = Math.floor((y - 6) / TILE)
  const y1 = Math.floor((y - eps) / TILE)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (ty < 0 || tx < 0 || ty >= map.rows.length || tx >= map.rows[0].length) return true
      if (SOLID.has(map.rows[ty][tx])) return true
      for (const npc of map.npcs) {
        if (npc.x === tx && npc.y === ty && shown(save, npc)) return true
      }
    }
  }
  return false
}

function slide(map: GameMap, x: number, y: number, dx: number, dy: number): { x: number; y: number } {
  let nx = x
  let ny = y
  if (!SOLID.has(tileAt(map, x + dx, y))) nx = x + dx
  if (!SOLID.has(tileAt(map, nx, y + dy))) ny = y + dy
  return { x: nx, y: ny }
}

function extraOf(field: FieldState): FieldExtra {
  let extra = extras.get(field)
  if (!extra) {
    extra = { trail: [{ x: field.x, y: field.y }], patrol: {} }
    extras.set(field, extra)
  }
  return extra
}

function trailSpan(trail: TrailPoint[]): number {
  let total = 0
  for (let i = 1; i < trail.length; i++) {
    total += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y)
  }
  return total
}

function pointBehind(trail: TrailPoint[], dist: number): TrailPoint {
  let remain = dist
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i]
    const b = trail[i - 1]
    const seg = Math.hypot(a.x - b.x, a.y - b.y)
    if (seg >= remain && seg > 0) {
      const t = remain / seg
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    remain -= seg
  }
  return trail[0] ?? { x: 0, y: 0 }
}

function rectHas(tx: number, ty: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  return tx >= rect.x && ty >= rect.y && tx < rect.x + rect.w && ty < rect.y + rect.h
}

type SpotKind = 'sign' | 'save' | 'shop' | 'gate' | 'bell' | 'script' | 'chest'

function interactAt(map: GameMap, x: number, y: number, kind: SpotKind) {
  return map.interacts.find(spot => spot.x === x && spot.y === y && spot.kind === kind)
}

function interactEvent(map: GameMap, save: SaveData, field: FieldState): FieldEvent | null {
  const foot = footTile(field)
  const aim = dirVector(field.facing)
  const front = { x: foot.x + aim.x, y: foot.y + aim.y }

  const npc = map.npcs.find(entry => entry.x === front.x && entry.y === front.y && shown(save, entry))
  if (npc) {
    if (npc.script) return { type: 'script', id: npc.script }
    return { type: 'lines', speaker: npc.name, portrait: npc.portrait, lines: npc.lines.slice() }
  }

  const chestSpot = interactAt(map, front.x, front.y, 'chest')
  if (chestSpot?.chest && !save.chests.includes(chestSpot.chest)) {
    const chest = map.chests.find(entry => entry.id === chestSpot.chest)
    if (chest) return { type: 'chest', chest }
  }

  const bell = interactAt(map, front.x, front.y, 'bell')
  if (bell) return { type: 'bell', id: bell.id }

  const script = interactAt(map, front.x, front.y, 'script')
  if (script?.script) return { type: 'script', id: script.script }

  const shop = interactAt(map, front.x, front.y, 'shop')
  if (shop?.shop) return { type: 'shop', id: shop.shop }

  const sign = interactAt(map, front.x, front.y, 'sign')
  if (sign) return { type: 'lines', speaker: 'Sign', portrait: 'npc', lines: [sign.text ?? ''] }

  const saveSpot = interactAt(map, front.x, front.y, 'save') ?? interactAt(map, foot.x, foot.y, 'save')
  if (saveSpot) return { type: 'save' }

  const gate = interactAt(map, front.x, front.y, 'gate') ?? interactAt(map, foot.x, foot.y, 'gate')
  if (gate) return { type: 'gate' }
  return null
}

export function createField(save: SaveData): FieldState {
  const map = mapById(save.map)
  const back = dirVector(save.facing)
  const behind = { x: -back.x, y: -back.y }
  const field: FieldState = {
    mapId: map.id,
    x: save.x,
    y: save.y,
    facing: save.facing,
    moving: false,
    followers: save.party.slice(1).map((member, index) => ({
      id: member.id,
      x: save.x + behind.x * 12 * (index + 1),
      y: save.y + behind.y * 12 * (index + 1),
      facing: save.facing,
      moving: false,
    })),
    enemies: {},
    encounterLock: 0,
    warpLatch: null,
    triggerLatch: null,
  }
  for (const enemy of map.enemies) {
    if (!shown(save, enemy) || save.defeated.includes(enemy.instanceId)) continue
    field.enemies[enemy.instanceId] = {
      x: (enemy.x + 0.5) * TILE,
      y: (enemy.y + 0.5) * TILE,
      facing: 'down',
    }
  }
  const trail: TrailPoint[] = []
  for (let dist = 48; dist >= 0; dist -= 4) {
    trail.push({ x: field.x + behind.x * dist, y: field.y + behind.y * dist })
  }
  extras.set(field, { trail, patrol: {} })
  return field
}

function movePlayer(field: FieldState, map: GameMap, save: SaveData, input: InputFrame, dt: number): void {
  const mag = Math.hypot(input.x, input.y)
  field.moving = mag > 0.01
  if (!field.moving) return
  const speed = (input.run ? RUN_SPEED : WALK_SPEED) * dt
  const dx = (input.x / mag) * speed
  const dy = (input.y / mag) * speed
  if (input.y !== 0 && Math.abs(input.y) >= Math.abs(input.x)) field.facing = input.y > 0 ? 'down' : 'up'
  else if (input.x !== 0) field.facing = input.x > 0 ? 'right' : 'left'
  if (!feetBlocked(map, save, field.x + dx, field.y)) field.x += dx
  if (!feetBlocked(map, save, field.x, field.y + dy)) field.y += dy
}

function moveFollowers(field: FieldState, dt: number): void {
  const extra = extraOf(field)
  const trail = extra.trail
  const last = trail[trail.length - 1]
  if (!last || Math.hypot(last.x - field.x, last.y - field.y) > 0.25) trail.push({ x: field.x, y: field.y })
  else {
    last.x = field.x
    last.y = field.y
  }
  while (trail.length > 2 && (trail.length > 100 || trailSpan(trail) > 120)) trail.shift()
  for (let i = 0; i < field.followers.length; i++) {
    const follower = field.followers[i]
    const goal = pointBehind(trail, 18 * (i + 1))
    const dx = goal.x - follower.x
    const dy = goal.y - follower.y
    const dist = Math.hypot(dx, dy)
    if (dist <= 0.5) {
      follower.moving = false
      continue
    }
    const step = Math.min(dist, Math.max(RUN_SPEED * dt, dist * 8 * dt))
    follower.x += (dx / dist) * step
    follower.y += (dy / dist) * step
    follower.moving = true
    follower.facing = facingFrom(dx, dy, follower.facing)
  }
}

function moveEnemies(field: FieldState, map: GameMap, save: SaveData, dt: number, events: FieldEvent[]): void {
  const extra = extraOf(field)
  const keep = new Set<string>()
  let fought = false
  for (const enemy of map.enemies) {
    if (!shown(save, enemy) || save.defeated.includes(enemy.instanceId)) continue
    keep.add(enemy.instanceId)
    if (!field.enemies[enemy.instanceId]) {
      field.enemies[enemy.instanceId] = {
        x: (enemy.x + 0.5) * TILE,
        y: (enemy.y + 0.5) * TILE,
        facing: 'down',
      }
    }
    const pos = field.enemies[enemy.instanceId]
    const dx = field.x - pos.x
    const dy = field.y - pos.y
    const dist = Math.hypot(dx, dy)
    if (enemy.chase && dist < 80) {
      if (dist > 16) {
        const step = Math.min(dist - 16, 30 * dt)
        const next = slide(map, pos.x, pos.y, (dx / dist) * step, (dy / dist) * step)
        pos.facing = facingFrom(next.x - pos.x, next.y - pos.y, pos.facing)
        pos.x = next.x
        pos.y = next.y
      }
    } else if (enemy.patrol.length > 0) {
      const index = extra.patrol[enemy.instanceId] ?? 0
      const wp = enemy.patrol[index % enemy.patrol.length]
      const tx = (wp.x + 0.5) * TILE
      const ty = (wp.y + 0.5) * TILE
      const pdx = tx - pos.x
      const pdy = ty - pos.y
      const pd = Math.hypot(pdx, pdy)
      if (pd <= 1.25) {
        pos.x = tx
        pos.y = ty
        extra.patrol[enemy.instanceId] = (index + 1) % enemy.patrol.length
      } else {
        const step = Math.min(pd, 24 * dt)
        const next = slide(map, pos.x, pos.y, (pdx / pd) * step, (pdy / pd) * step)
        if (Math.hypot(next.x - pos.x, next.y - pos.y) < 0.01) {
          extra.patrol[enemy.instanceId] = (index + 1) % enemy.patrol.length
        } else {
          pos.facing = facingFrom(next.x - pos.x, next.y - pos.y, pos.facing)
          pos.x = next.x
          pos.y = next.y
        }
      }
    }
    const after = Math.hypot(field.x - pos.x, field.y - pos.y)
    if (!fought && after < 14 && field.encounterLock <= 0) {
      fought = true
      field.encounterLock = 2
      const face = dirVector(pos.facing)
      const dot = face.x * (field.x - pos.x) + face.y * (field.y - pos.y)
      events.push({
        type: 'battle',
        instanceId: enemy.instanceId,
        enemies: enemy.enemies.slice(),
        ambush: dot <= 0 ? 'player' : 'fair',
        boss: enemy.boss,
        victoryFlag: enemy.victoryFlag,
      })
    }
  }
  for (const id of Object.keys(field.enemies)) {
    if (!keep.has(id)) delete field.enemies[id]
  }
}

function checkWarp(field: FieldState, map: GameMap, save: SaveData, events: FieldEvent[]): void {
  const foot = footTile(field)
  let occupied = false
  for (const warp of map.warps) {
    if (!rectHas(foot.x, foot.y, warp)) continue
    occupied = true
    if (field.warpLatch !== warp.id) {
      field.warpLatch = warp.id
      if (warp.requires && save.flags[warp.requires] !== true) {
        events.push({ type: 'deny', text: warp.deny ?? 'Locked.' })
      } else {
        events.push({ type: 'warp', map: warp.to, x: warp.tx, y: warp.ty, facing: warp.facing })
      }
    }
    break
  }
  if (!occupied) field.warpLatch = null
}

function checkTrigger(field: FieldState, map: GameMap, save: SaveData, events: FieldEvent[]): void {
  const foot = footTile(field)
  let occupied = false
  for (const trigger of map.triggers) {
    if (!rectHas(foot.x, foot.y, trigger)) continue
    occupied = true
    if (field.triggerLatch !== trigger.id) {
      const seen = trigger.once === true && save.flags[`seen:${trigger.id}`] === true
      if (shown(save, trigger) && !seen) {
        field.triggerLatch = trigger.id
        events.push({ type: 'trigger', id: trigger.id, script: trigger.script })
      }
    }
    break
  }
  if (!occupied) field.triggerLatch = null
}

export function tickField(field: FieldState, save: SaveData, input: InputFrame, dt: number): FieldEvent[] {
  const map = mapById(field.mapId)
  const events: FieldEvent[] = []
  if (field.encounterLock > 0) field.encounterLock = Math.max(0, field.encounterLock - dt)
  movePlayer(field, map, save, input, dt)
  moveFollowers(field, dt)
  moveEnemies(field, map, save, dt, events)
  checkWarp(field, map, save, events)
  checkTrigger(field, map, save, events)
  if (input.confirm) {
    const spot = interactEvent(map, save, field)
    if (spot) events.push(spot)
  }
  return events
}

export function fieldCamera(field: FieldState): { x: number; y: number } {
  const map = mapById(field.mapId)
  const mapW = map.rows[0].length * TILE
  const mapH = map.rows.length * TILE
  let x = Math.round(field.x - VIEW_W / 2)
  let y = Math.round(field.y - VIEW_H / 2)
  if (mapW <= VIEW_W) x = 0
  else x = Math.max(0, Math.min(mapW - VIEW_W, x))
  if (mapH <= VIEW_H) y = 0
  else y = Math.max(0, Math.min(mapH - VIEW_H, y))
  return { x, y }
}
