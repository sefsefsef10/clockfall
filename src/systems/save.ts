import type { CharacterId, Dir, Element, MapId, MemberState, SaveData, Settings } from '../types.ts'
import { AUTO_KEY, SAVE_KEY, TILE } from '../const.ts'
import { characters, enemies, itemById, maps, puzzles, techs, START } from '../content/index.ts'
import { makeMember } from './stats.ts'

const DIRS: Dir[] = ['down', 'up', 'left', 'right']
const ELEMENTS: Element[] = ['phys', 'fire', 'ice', 'volt', 'shadow', 'time', 'heal']
const MAP_IDS: MapId[] = Object.values(maps).map((map) => map.id)
const CHARACTER_IDS: CharacterId[] = Object.values(characters).map((character) => character.id)
const ITEM_IDS = new Set(Object.keys(itemById))
const TECH_IDS = new Set(techs.map((tech) => tech.id))
const ENEMY_IDS = new Set(enemies.map((enemy) => enemy.id))
const CHEST_IDS = new Set(Object.values(maps).flatMap((map) => map.chests.map((chest) => chest.id)))
const ENEMY_INSTANCE_IDS = new Set(Object.values(maps).flatMap((map) => map.enemies.map((enemy) => enemy.instanceId)))
const PUZZLE_BY_ID = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]))

export function defaultSettings(): Settings {
  return { atb: 'wait', speed: 1.5, volume: 0.7, shake: true, text: 'mid' }
}

export function newGame(partial?: Partial<Settings>): SaveData {
  return {
    version: 1,
    party: [makeMember('kael', 1)],
    inventory: { tonic: 2 },
    gear: ['practice-blade', 'kael-cloth'],
    gold: 50,
    flags: {},
    unlockedTechs: [],
    chests: [],
    defeated: [],
    puzzleProgress: {},
    map: START.map,
    x: (START.tileX + 0.5) * TILE,
    y: (START.tileY + 0.5) * TILE,
    facing: START.facing,
    objective: 'See what shook the fairgrounds.',
    bestiary: {},
    echoMax: 0,
    settings: { ...defaultSettings(), ...partial },
    playtime: 0,
    cleared: false,
  }
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null
    return localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.some((entry) => entry === value)
}

function stringList(value: unknown, allowed: Set<string>, maxItems = 1000): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null
  if (!value.every((entry): entry is string => typeof entry === 'string' && allowed.has(entry))) return null
  return [...new Set(value)]
}

function normalizeSettings(value: unknown): Settings {
  const settings = defaultSettings()
  if (!isRecord(value)) return settings
  if (value.atb === 'wait' || value.atb === 'active') settings.atb = value.atb
  if (value.speed === 1 || value.speed === 1.5 || value.speed === 2 || value.speed === 3) settings.speed = value.speed
  if (isFiniteIn(value.volume, 0, 1)) settings.volume = value.volume
  if (typeof value.shake === 'boolean') settings.shake = value.shake
  if (value.text === 'slow' || value.text === 'mid' || value.text === 'fast') settings.text = value.text
  return settings
}

function normalizeParty(value: unknown): MemberState[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > CHARACTER_IDS.length) return null
  const party: MemberState[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isRecord(entry) || !isOneOf(entry.id, CHARACTER_IDS) || seen.has(entry.id)) return null
    const level = entry.level
    if (!isFiniteIn(level, 1, 99) || !Number.isInteger(level)) return null
    if (!isFiniteIn(entry.xp, 0, 1_000_000_000)) return null
    if (!isFiniteIn(entry.hp, 0, 10_000) || !isFiniteIn(entry.mp, 0, 10_000)) return null
    const weapon = entry.weapon
    const armor = entry.armor
    const weaponDef = typeof weapon === 'string' ? itemById[weapon] : undefined
    const armorDef = typeof armor === 'string' ? itemById[armor] : undefined
    if (typeof weapon !== 'string' || !weaponDef || weaponDef.kind !== 'weapon' || (weaponDef.users && !weaponDef.users.includes(entry.id))) return null
    if (typeof armor !== 'string' || !armorDef || armorDef.kind !== 'armor' || (armorDef.users && !armorDef.users.includes(entry.id))) return null
    seen.add(entry.id)
    party.push({
      id: entry.id,
      level,
      xp: entry.xp,
      hp: entry.hp,
      mp: entry.mp,
      weapon,
      armor,
    })
  }
  return party
}

function normalizeInventory(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!isRecord(value)) return { ...fallback }
  const inventory: Record<string, number> = {}
  for (const [id, count] of Object.entries(value)) {
    if (ITEM_IDS.has(id) && isFiniteIn(count, 0, 9999) && Number.isInteger(count)) inventory[id] = count
  }
  return inventory
}

function normalizeFlags(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {}
  const flags: Record<string, boolean> = {}
  for (const [key, flag] of Object.entries(value)) {
    if (key.length > 0 && key.length <= 200 && typeof flag === 'boolean') flags[key] = flag
  }
  return flags
}

function normalizePuzzleProgress(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {}
  const progress: Record<string, string[]> = {}
  for (const [id, rawSequence] of Object.entries(value)) {
    const puzzle = PUZZLE_BY_ID.get(id)
    if (!puzzle || !Array.isArray(rawSequence) || rawSequence.length > puzzle.sequence.length) continue
    if (!rawSequence.every((step): step is string => typeof step === 'string' && puzzle.sequence.includes(step))) continue
    progress[id] = [...rawSequence]
  }
  return progress
}

function normalizeBestiary(value: unknown): Record<string, Element[]> {
  if (!isRecord(value)) return {}
  const bestiary: Record<string, Element[]> = {}
  for (const [enemyId, rawElements] of Object.entries(value)) {
    if (!ENEMY_IDS.has(enemyId) || !Array.isArray(rawElements)) continue
    const elements = rawElements.filter((element): element is Element => isOneOf(element, ELEMENTS))
    bestiary[enemyId] = [...new Set(elements)]
  }
  return bestiary
}

function normalize(raw: Record<string, unknown>): SaveData | null {
  if (raw.version !== 1) return null
  const party = normalizeParty(raw.party)
  if (!party) return null
  if (!isOneOf(raw.map, MAP_IDS)) return null
  const map = maps[raw.map]
  const x = raw.x === undefined ? (START.tileX + 0.5) * TILE : raw.x
  const y = raw.y === undefined ? (START.tileY + 0.5) * TILE : raw.y
  if (!isFiniteIn(x, 0, map.rows[0].length * TILE) || !isFiniteIn(y, 0, map.rows.length * TILE)) return null
  const rawGold = raw.gold
  if (rawGold !== undefined && !isFiniteIn(rawGold, 0, 1_000_000_000)) return null
  const rawEchoMax = raw.echoMax
  if (rawEchoMax !== undefined && !isFiniteIn(rawEchoMax, 0, 999)) return null
  const rawPlaytime = raw.playtime
  if (rawPlaytime !== undefined && !isFiniteIn(rawPlaytime, 0, 1_000_000_000_000)) return null
  const fallback = newGame()
  const gear = stringList(raw.gear, new Set([...ITEM_IDS].filter((id) => {
    const item = itemById[id]
    return item.kind === 'weapon' || item.kind === 'armor'
  }))) ?? [...fallback.gear]
  const unlockedTechs = stringList(raw.unlockedTechs, TECH_IDS) ?? [...fallback.unlockedTechs]
  const chests = stringList(raw.chests, CHEST_IDS) ?? [...fallback.chests]
  const defeated = stringList(raw.defeated, ENEMY_INSTANCE_IDS) ?? [...fallback.defeated]
  return {
    version: 1,
    party,
    inventory: normalizeInventory(raw.inventory, fallback.inventory),
    gear,
    gold: rawGold === undefined ? fallback.gold : rawGold,
    flags: normalizeFlags(raw.flags),
    unlockedTechs,
    chests,
    defeated,
    puzzleProgress: normalizePuzzleProgress(raw.puzzleProgress),
    map: raw.map,
    x,
    y,
    facing: isOneOf(raw.facing, DIRS) ? raw.facing : 'down',
    objective: typeof raw.objective === 'string' && raw.objective.length <= 2000 ? raw.objective : fallback.objective,
    bestiary: normalizeBestiary(raw.bestiary),
    echoMax: rawEchoMax === undefined ? 0 : rawEchoMax,
    settings: normalizeSettings(raw.settings),
    playtime: rawPlaytime === undefined ? 0 : rawPlaytime,
    cleared: raw.cleared === true,
  }
}

function read(key: string): SaveData | null {
  const store = storage()
  if (!store) return null
  let raw: string | null
  try {
    raw = store.getItem(key)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    return normalize(parsed)
  } catch {
    return null
  }
}

function write(key: string, data: SaveData): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(data))
  } catch {
    /* ignore quota and privacy errors */
  }
}

export function loadManual(): SaveData | null {
  return read(SAVE_KEY)
}

export function saveManual(data: SaveData): void {
  write(SAVE_KEY, data)
}

export function loadAuto(): SaveData | null {
  return read(AUTO_KEY)
}

export function saveAuto(data: SaveData): void {
  write(AUTO_KEY, data)
}

export function hasManualSave(): boolean {
  return loadManual() !== null
}
