import type { CharacterDef, CharacterId, LevelGain, MemberState, Stats } from '../types.ts'
import { characters, itemById } from '../content/index.ts'

function characterList(): CharacterDef[] {
  const value: unknown = characters
  if (Array.isArray(value)) return value as CharacterDef[]
  if (value && typeof value === 'object') return Object.values(value as Record<string, CharacterDef>)
  return []
}

function characterOf(id: CharacterId): CharacterDef {
  const found = characterList().find(c => c.id === id)
  if (!found) throw new Error(`Unknown character: ${id}`)
  return found
}

function gearStat(member: MemberState, key: keyof Stats): number {
  let total = 0
  const worn = [itemById[member.weapon], itemById[member.armor]]
  for (const item of worn) {
    if (!item) continue
    const value = item[key]
    if (typeof value === 'number') total += value
  }
  return total
}

function coreStat(member: MemberState, key: keyof Stats): number {
  const def = characterOf(member.id)
  return def.base[key] + def.growth[key] * (member.level - 1) + gearStat(member, key)
}

export function xpToNext(level: number): number {
  return 16 + level * 14
}

export function maxHp(member: MemberState): number {
  return coreStat(member, 'hp')
}

export function maxMp(member: MemberState): number {
  return coreStat(member, 'mp')
}

export function combatNumbers(member: MemberState): { maxHp: number; maxMp: number; atk: number; def: number; mag: number; spd: number } {
  return {
    maxHp: maxHp(member),
    maxMp: maxMp(member),
    atk: coreStat(member, 'atk'),
    def: coreStat(member, 'def'),
    mag: coreStat(member, 'mag'),
    spd: coreStat(member, 'spd'),
  }
}

export function makeMember(id: CharacterId, level?: number): MemberState {
  const def = characterOf(id)
  const member: MemberState = {
    id,
    level: level ?? def.joinLevel,
    xp: 0,
    hp: 0,
    mp: 0,
    weapon: def.weapon,
    armor: def.armor,
  }
  member.hp = maxHp(member)
  member.mp = maxMp(member)
  return member
}

export function clampVitals(member: MemberState): MemberState {
  const copy = { ...member }
  copy.hp = Math.min(maxHp(copy), Math.max(0, copy.hp))
  copy.mp = Math.min(maxMp(copy), Math.max(0, copy.mp))
  return copy
}

export function healParty(party: MemberState[]): MemberState[] {
  return party.map(member => {
    const copy = { ...member }
    copy.hp = maxHp(copy)
    copy.mp = maxMp(copy)
    return copy
  })
}

export function grantXp(party: MemberState[], xp: number): { party: MemberState[]; levels: LevelGain[] } {
  const levels: LevelGain[] = []
  const next = party.map(member => {
    const copy = { ...member }
    if (copy.hp <= 0 || xp <= 0) return copy
    const from = copy.level
    copy.xp += xp
    while (copy.xp >= xpToNext(copy.level)) {
      copy.xp -= xpToNext(copy.level)
      copy.level += 1
    }
    if (copy.level !== from) {
      copy.hp = maxHp(copy)
      copy.mp = maxMp(copy)
      levels.push({ id: copy.id, name: characterOf(copy.id).name, from, to: copy.level })
    }
    return copy
  })
  return { party: next, levels }
}

function scaleVital(current: number, oldMax: number, newMax: number): number {
  if (!(oldMax > 0)) return Math.min(newMax, Math.max(0, current))
  const scaled = Math.round((current / oldMax) * newMax)
  return Math.min(newMax, Math.max(0, scaled))
}

export function equip(
  party: MemberState[],
  gear: string[],
  id: CharacterId,
  slot: 'weapon' | 'armor',
  itemId: string,
): { ok: true; party: MemberState[]; gear: string[] } | { ok: false; error: string } {
  if (!party.some(member => member.id === id)) return { ok: false, error: 'Not in party' }
  const item = itemById[itemId]
  if (!item) return { ok: false, error: 'No such item' }
  if (!gear.includes(itemId)) return { ok: false, error: 'Not owned' }
  if (item.kind !== slot) return { ok: false, error: 'Wrong kind' }
  if (item.users && !item.users.includes(id)) return { ok: false, error: 'Cannot equip' }
  const worn = party.some(member => member.id !== id && (member.weapon === itemId || member.armor === itemId))
  if (worn) return { ok: false, error: 'Already worn' }

  let changed = false
  const next = party.map(member => {
    if (changed || member.id !== id) return { ...member }
    changed = true
    const copy = { ...member }
    const prev = combatNumbers(copy)
    if (slot === 'weapon') copy.weapon = itemId
    else copy.armor = itemId
    const now = combatNumbers(copy)
    copy.hp = scaleVital(copy.hp, prev.maxHp, now.maxHp)
    copy.mp = scaleVital(copy.mp, prev.maxMp, now.maxMp)
    return copy
  })
  return { ok: true, party: next, gear }
}
