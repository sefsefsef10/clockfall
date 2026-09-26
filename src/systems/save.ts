import type { Dir, MapId, SaveData, Settings } from '../types.ts'
import { AUTO_KEY, SAVE_KEY, TILE } from '../const.ts'
import { START } from '../content/index.ts'
import { makeMember } from './stats.ts'

const DIRS: Dir[] = ['down', 'up', 'left', 'right']

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

function normalize(raw: Record<string, unknown>): SaveData {
  const settings = defaultSettings()
  if (isRecord(raw.settings)) {
    const src = raw.settings
    if (src.atb === 'wait' || src.atb === 'active') settings.atb = src.atb
    if (typeof src.speed === 'number') settings.speed = src.speed
    if (typeof src.volume === 'number') settings.volume = src.volume
    if (typeof src.shake === 'boolean') settings.shake = src.shake
    if (src.text === 'slow' || src.text === 'mid' || src.text === 'fast') settings.text = src.text
  }
  const facing = DIRS.includes(raw.facing as Dir) ? raw.facing as Dir : 'down'
  const map = typeof raw.map === 'string' ? raw.map as MapId : START.map
  return {
    version: 1,
    party: Array.isArray(raw.party) ? raw.party as SaveData['party'] : [],
    inventory: isRecord(raw.inventory) ? raw.inventory as SaveData['inventory'] : {},
    gear: Array.isArray(raw.gear) ? raw.gear as string[] : [],
    gold: typeof raw.gold === 'number' ? raw.gold : 0,
    flags: isRecord(raw.flags) ? raw.flags as SaveData['flags'] : {},
    unlockedTechs: Array.isArray(raw.unlockedTechs) ? raw.unlockedTechs as string[] : [],
    chests: Array.isArray(raw.chests) ? raw.chests as string[] : [],
    defeated: Array.isArray(raw.defeated) ? raw.defeated as string[] : [],
    puzzleProgress: isRecord(raw.puzzleProgress) ? raw.puzzleProgress as SaveData['puzzleProgress'] : {},
    map,
    x: typeof raw.x === 'number' ? raw.x : 0,
    y: typeof raw.y === 'number' ? raw.y : 0,
    facing,
    objective: typeof raw.objective === 'string' ? raw.objective : '',
    bestiary: isRecord(raw.bestiary) ? raw.bestiary as SaveData['bestiary'] : {},
    echoMax: typeof raw.echoMax === 'number' ? raw.echoMax : 0,
    settings,
    playtime: typeof raw.playtime === 'number' ? raw.playtime : 0,
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
