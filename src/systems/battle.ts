import type {
  BattleCreateOpts,
  BattleSnapshot,
  BattleState,
  CharacterDef,
  CharacterId,
  Combatant,
  DamageEvent,
  Element,
  EnemyDef,
  EnemySkill,
  ItemDef,
  MemberState,
  StatusId,
  TechDef,
} from '../types.ts'
import { characters, enemyById, itemById, items, techById, techs } from '../content/index.ts'
import { combatNumbers, grantXp, makeMember, maxHp, xpToNext } from './stats.ts'

/**
 * BattleCreateOpts has no room for unlocks or the bag. The game may pass
 * `unlocked` (tech ids and flag names) and `inventory` alongside the typed
 * fields. Both are copied onto a WeakMap so the save itself is not mutated.
 */
interface BattleBag {
  unlocked: string[]
  inventory: Record<string, number>
  pending: Pending | null
  chosenUid: string | null
  resolving: Resolving | null
}

type Pending =
  | { kind: 'attack' }
  | { kind: 'tech'; techId: string; combo: boolean }
  | { kind: 'item'; itemId: string }

interface Resolving {
  actorUids: string[]
  atk: number
  mag: number
  element: Element
  power: number
  heal: boolean
  revive: boolean
  interrupt: boolean
  ultimate: boolean
  techId: string
  status?: { id: StatusId; chance: number; turns: number }
  banner: string
  mpCost: number
  itemId?: string
  targetUids: string[]
  fray: boolean
  brokeLogged: boolean
  frayLogged: boolean
}

interface CommandRow {
  id: string
  label: string
  detail?: string
  disabled?: boolean
}

const ELEMENT_NAME: Record<Element, string> = {
  phys: 'Physical',
  fire: 'Fire',
  ice: 'Ice',
  volt: 'Volt',
  shadow: 'Shadow',
  time: 'Time',
  heal: 'Heal',
}

const bags = new WeakMap<BattleState, BattleBag>()
let floaterSeq = 1

function characterList(): CharacterDef[] {
  const value: unknown = characters
  if (Array.isArray(value)) return value as CharacterDef[]
  if (value && typeof value === 'object') return Object.values(value as Record<string, CharacterDef>)
  return []
}

function characterOf(id: string): CharacterDef {
  const found = characterList().find(entry => entry.id === id)
  if (!found) throw new Error(`Unknown character: ${id}`)
  return found
}

function enemyOf(id: string): EnemyDef {
  const def = enemyById[id]
  if (!def) throw new Error(`Unknown enemy: ${id}`)
  return def
}

function allTechs(): TechDef[] {
  const value: unknown = techs
  if (Array.isArray(value)) return value as TechDef[]
  return Object.values(techById)
}

function allItems(): ItemDef[] {
  const value: unknown = items
  if (Array.isArray(value)) return value as ItemDef[]
  return Object.values(itemById)
}

function bagOf(battle: BattleState): BattleBag {
  let bag = bags.get(battle)
  if (!bag) {
    bag = { unlocked: [], inventory: {}, pending: null, chosenUid: null, resolving: null }
    bags.set(battle, bag)
  }
  return bag
}

function nextUnit(battle: BattleState): number {
  battle.rng = (battle.rng + 0x6d2b79f5) >>> 0
  let t = battle.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function log(battle: BattleState, line: string): void {
  battle.log.push(line)
  if (battle.log.length > 12) battle.log.splice(0, battle.log.length - 12)
}

function findUid(battle: BattleState, uid: string): Combatant | undefined {
  return battle.allies.find(entry => entry.uid === uid) ?? battle.enemies.find(entry => entry.uid === uid)
}

function actorOf(battle: BattleState): Combatant | null {
  if (!battle.actorUid) return null
  return findUid(battle, battle.actorUid) ?? null
}

function living(list: Combatant[]): Combatant[] {
  return list.filter(entry => entry.alive)
}

function mod(index: number, len: number): number {
  if (len <= 0) return 0
  return ((index % len) + len) % len
}

function pushFloater(battle: BattleState, target: Combatant, text: string, kind: 'dmg' | 'heal' | 'weak'): void {
  const party = target.kind === 'party'
  const index = party ? battle.allies.indexOf(target) : battle.enemies.indexOf(target)
  const slot = index < 0 ? 0 : index
  battle.floaters.push({
    id: `f${floaterSeq++}`,
    text,
    x: party ? 0.22 : 0.72,
    y: party ? 0.55 + slot * 0.1 : 0.30 + slot * 0.12,
    kind,
    life: 0.9,
  })
}

function ageFloaters(battle: BattleState, dt: number): void {
  for (const floater of battle.floaters) floater.life -= dt
  battle.floaters = battle.floaters.filter(floater => floater.life > 0)
}

function fell(target: Combatant): void {
  target.hp = 0
  target.alive = false
  target.atb = 0
  target.charging = null
  target.defending = false
}

function addStatus(target: Combatant, id: StatusId, turns: number): void {
  const prev = target.statuses.find(status => status.id === id)
  if (prev) prev.turns = turns
  else target.statuses.push({ id, turns })
}

function decStatuses(target: Combatant): void {
  const next = []
  for (const status of target.statuses) {
    if (status.turns - 1 > 0) next.push({ id: status.id, turns: status.turns - 1 })
  }
  target.statuses = next
}

function techUnlocked(battle: BattleState, tech: TechDef): boolean {
  if (!tech.unlockFlag) return true
  const unlocked = bagOf(battle).unlocked
  return unlocked.includes(tech.id) || unlocked.includes(tech.unlockFlag)
}

function memberById(battle: BattleState, id: CharacterId): Combatant | undefined {
  return battle.allies.find(entry => entry.characterId === id)
}

function comboReady(battle: BattleState, actor: Combatant, tech: TechDef): boolean {
  if (tech.users.length < 2) return false
  if (!actor.characterId || !tech.users.includes(actor.characterId)) return false
  if (!techUnlocked(battle, tech)) return false
  return tech.users.every(id => {
    const member = memberById(battle, id)
    return !!member && member.alive
  })
}

function makeEnemy(def: EnemyDef, uid: string, atb: number): Combatant {
  return {
    uid,
    kind: 'enemy',
    defId: def.id,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    mp: def.mp,
    maxMp: def.mp,
    atk: def.atk,
    def: def.def,
    mag: def.mag,
    spd: def.spd,
    atb,
    statuses: [],
    defending: false,
    charging: null,
    alive: true,
    sprite: def.sprite,
    weaknesses: def.weaknesses.slice(),
    resists: def.resists.slice(),
    xp: def.xp,
    gold: def.gold,
    drops: (def.drops ?? []).map(drop => ({ item: drop.item, chance: drop.chance })),
    boss: def.boss === true,
    acted: false,
  }
}

function makeAlly(memberIndex: number, member: MemberState, atb: number): Combatant {
  const nums = combatNumbers(member)
  const def = characterOf(member.id)
  const alive = member.hp > 0
  return {
    uid: `a${memberIndex}`,
    kind: 'party',
    defId: member.id,
    name: def.name,
    hp: alive ? Math.min(nums.maxHp, member.hp) : 0,
    maxHp: nums.maxHp,
    mp: Math.min(nums.maxMp, Math.max(0, member.mp)),
    maxMp: nums.maxMp,
    atk: nums.atk,
    def: nums.def,
    mag: nums.mag,
    spd: nums.spd,
    atb: alive ? atb : 0,
    statuses: [],
    defending: false,
    charging: null,
    alive,
    sprite: def.sprite,
    weaknesses: [],
    resists: [],
    xp: 0,
    gold: 0,
    drops: [],
    boss: false,
    characterId: member.id,
    level: member.level,
    acted: false,
  }
}

export function createBattle(party: MemberState[], enemyIds: string[], opts: BattleCreateOpts): BattleState {
  const extra = opts as BattleCreateOpts & { unlocked?: string[]; inventory?: Record<string, number> }
  let allyAtb = 0
  let enemyAtb = 0
  if (opts.ambush === 'player') allyAtb = 40
  if (opts.ambush === 'enemy') enemyAtb = 40
  if (opts.tutorial) allyAtb = 100
  const battle: BattleState = {
    phase: 'intro',
    allies: party.map((member, index) => makeAlly(index, member, allyAtb)),
    enemies: enemyIds.map((id, index) => makeEnemy(enemyOf(id), `e${index}`, enemyAtb)),
    mode: opts.mode,
    speed: opts.speed,
    actorUid: null,
    menu: 'root',
    menuIndex: 0,
    targetSide: 'enemy',
    targetIndex: 0,
    pendingTech: null,
    echoes: opts.echoMax,
    echoMax: opts.echoMax,
    log: [],
    banner: 'CONTACT',
    bannerT: 0.7,
    anim: null,
    rewards: { xp: 0, gold: 0, items: [], levels: [] },
    result: 'ongoing',
    tutorial: opts.tutorial === true,
    lockedElement: null,
    hourSpawned: false,
    floaters: [],
    history: [],
    discovered: [],
    consumed: [],
    rng: 0x12345678,
  }
  bags.set(battle, {
    unlocked: (extra.unlocked ?? []).slice(),
    inventory: { ...(extra.inventory ?? {}) },
    pending: null,
    chosenUid: null,
    resolving: null,
  })
  return battle
}

function canFill(battle: BattleState): boolean {
  if (battle.phase === 'run' || battle.phase === 'combo-wait') return true
  if ((battle.phase === 'command' || battle.phase === 'target') && battle.mode === 'active') return true
  return false
}

function fillAtb(battle: BattleState, dt: number): void {
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (!unit.alive) continue
    let rate = unit.spd * dt * 3.2 * battle.speed
    if (unit.statuses.some(status => status.id === 'haste')) rate *= 1.45
    if (unit.statuses.some(status => status.id === 'slow')) rate *= 0.62
    unit.atb = Math.min(100, unit.atb + rate)
  }
}

function advanceCharges(battle: BattleState, dt: number): void {
  for (const enemy of battle.enemies) {
    if (!enemy.alive || !enemy.charging) continue
    if (enemy.charging.t < enemy.charging.dur) {
      enemy.charging.t = Math.min(enemy.charging.dur, enemy.charging.t + dt)
    }
  }
}

function snapshot(battle: BattleState): void {
  const shot: BattleSnapshot = {
    allies: structuredClone(battle.allies),
    enemies: structuredClone(battle.enemies),
    lockedElement: battle.lockedElement,
    hourSpawned: battle.hourSpawned,
    log: structuredClone(battle.log),
  }
  battle.history.push(shot)
  if (battle.history.length > 6) battle.history.shift()
}

function tickPoison(battle: BattleState, unit: Combatant): boolean {
  if (!unit.alive || !unit.statuses.some(status => status.id === 'poison')) return unit.alive
  const amount = Math.max(1, Math.round(unit.maxHp * 0.07))
  unit.hp = Math.max(0, unit.hp - amount)
  log(battle, `${unit.name} suffers poison.`)
  pushFloater(battle, unit, String(amount), 'dmg')
  if (unit.hp <= 0) {
    fell(unit)
    log(battle, `${unit.name} falls.`)
    return false
  }
  return true
}

function checkEnd(battle: BattleState): boolean {
  if (!battle.allies.some(unit => unit.alive)) {
    battle.phase = 'defeat'
    battle.result = 'lose'
    battle.anim = null
    battle.actorUid = null
    battle.banner = 'Defeat'
    battle.bannerT = 1.4
    return true
  }
  if (!battle.enemies.some(unit => unit.alive)) {
    battle.phase = 'victory'
    battle.result = 'win'
    battle.anim = null
    battle.actorUid = null
    battle.banner = 'Victory'
    battle.bannerT = 1.4
    let xp = 0
    let gold = 0
    const loot: string[] = []
    for (const enemy of battle.enemies) {
      xp += enemy.xp
      gold += enemy.gold
      for (const drop of enemy.drops) {
        if (nextUnit(battle) < drop.chance) loot.push(drop.item)
      }
    }
    battle.rewards = { xp, gold, items: loot, levels: [] }
    return true
  }
  return false
}

function maybeSpawnHour(battle: BattleState): void {
  if (battle.hourSpawned) return
  const stillness = battle.enemies.find(enemy => enemy.defId === 'stillness' && enemy.alive)
  if (!stillness || stillness.maxHp <= 0) return
  if (battle.enemies.some(enemy => enemy.defId === 'minute' && enemy.alive)) return
  if (stillness.hp / stillness.maxHp >= 0.4) return
  const def = enemyById['hour']
  if (!def) return
  battle.enemies.push(makeEnemy(def, `e${battle.enemies.length}`, 0))
  battle.hourSpawned = true
  log(battle, 'An hour hand tears loose.')
}

function blankHit(techId: string, element: Element): Resolving {
  return {
    actorUids: [],
    atk: 0,
    mag: 0,
    element,
    power: 0,
    heal: false,
    revive: false,
    interrupt: false,
    ultimate: false,
    techId,
    banner: techId,
    mpCost: 0,
    targetUids: [],
    fray: false,
    brokeLogged: false,
    frayLogged: false,
  }
}

function planAttack(actor: Combatant, targets: Combatant[]): Resolving {
  const plan = blankHit('attack', 'phys')
  plan.actorUids = [actor.uid]
  plan.atk = actor.atk
  plan.mag = actor.mag
  plan.power = 10
  plan.banner = 'Attack'
  plan.targetUids = targets.map(target => target.uid)
  return plan
}

function planDefend(actor: Combatant): Resolving {
  const plan = blankHit('defend', 'phys')
  plan.actorUids = [actor.uid]
  plan.atk = actor.atk
  plan.mag = actor.mag
  plan.banner = 'Defend'
  return plan
}

function planTech(users: Combatant[], tech: TechDef, targets: Combatant[]): Resolving {
  const plan = blankHit(tech.id, tech.element)
  plan.actorUids = users.map(user => user.uid)
  plan.atk = users.reduce((sum, user) => sum + user.atk, 0)
  plan.mag = users.reduce((sum, user) => sum + user.mag, 0)
  plan.power = tech.power
  plan.heal = tech.heal === true
  plan.revive = tech.revive === true
  plan.interrupt = tech.interrupt === true
  plan.status = tech.status
  plan.banner = tech.name
  plan.mpCost = tech.mp
  plan.targetUids = targets.map(target => target.uid)
  return plan
}

function planItem(actor: Combatant, item: ItemDef, targets: Combatant[]): Resolving {
  const plan = blankHit(`item:${item.id}`, 'heal')
  plan.actorUids = [actor.uid]
  plan.atk = actor.atk
  plan.mag = actor.mag
  plan.heal = true
  plan.revive = item.revive === true
  plan.banner = item.name
  plan.itemId = item.id
  plan.targetUids = targets.map(target => target.uid)
  return plan
}

function planSkill(battle: BattleState, enemy: Combatant, skill: EnemySkill, targets: Combatant[]): Resolving {
  const ups = living(battle.allies)
  const guards = ups.filter(unit => unit.defending).length
  const plan = blankHit(skill.id, skill.element)
  plan.actorUids = [enemy.uid]
  plan.atk = enemy.atk
  plan.mag = enemy.mag
  plan.power = skill.power
  plan.heal = skill.heal === true
  plan.ultimate = skill.ultimate === true
  plan.status = skill.status
  plan.banner = skill.name
  plan.targetUids = targets.map(target => target.uid)
  plan.fray = plan.ultimate && ups.length > 0 && guards >= Math.ceil(ups.length / 2)
  return plan
}

function beginResolve(battle: BattleState, actors: Combatant[], plan: Resolving): void {
  if (plan.mpCost > 0 && actors.some(actor => actor.mp < plan.mpCost)) {
    log(battle, 'Not enough MP.')
    return
  }
  if (plan.itemId && (bagOf(battle).inventory[plan.itemId] ?? 0) <= 0) {
    log(battle, 'Empty.')
    return
  }
  snapshot(battle)
  let died = false
  for (const actor of actors) {
    if (!tickPoison(battle, actor)) died = true
  }
  if (died) {
    battle.actorUid = null
    battle.pendingTech = null
    battle.anim = null
    bagOf(battle).pending = null
    bagOf(battle).resolving = null
    if (!checkEnd(battle)) battle.phase = 'run'
    return
  }
  for (const actor of actors) {
    actor.defending = false
    actor.acted = true
    actor.atb = 0
    if (plan.mpCost > 0) actor.mp = Math.max(0, actor.mp - plan.mpCost)
  }
  if (plan.itemId) {
    const bag = bagOf(battle)
    bag.inventory[plan.itemId] = (bag.inventory[plan.itemId] ?? 0) - 1
    battle.consumed.push(plan.itemId)
    log(battle, `${actors[0].name} uses ${plan.banner}.`)
  }
  bagOf(battle).pending = null
  if (plan.techId === 'defend') {
    actors[0].defending = true
    log(battle, `${actors[0].name} guards.`)
    for (const actor of actors) decStatuses(actor)
    battle.phase = 'run'
    battle.actorUid = null
    battle.pendingTech = null
    battle.menu = 'root'
    return
  }
  if (plan.techId !== 'attack' && !plan.itemId) log(battle, `${actors[0].name}: ${plan.banner}.`)
  else if (plan.techId === 'attack') log(battle, `${actors[0].name} attacks.`)
  battle.phase = 'resolve'
  battle.actorUid = actors[0].uid
  battle.menu = 'root'
  battle.pendingTech = null
  battle.banner = plan.banner
  battle.bannerT = 0.6
  battle.anim = {
    name: plan.banner,
    element: plan.element,
    actorUid: actors[0].uid,
    targetUids: plan.targetUids.slice(),
    t: 0,
    dur: 0.48,
    hitAt: 0.2,
    applied: false,
    damages: [],
    banner: plan.banner,
  }
  bagOf(battle).resolving = plan
}

function reveal(battle: BattleState, target: Combatant): void {
  const names: string[] = []
  for (const element of target.weaknesses) {
    if (!battle.discovered.some(entry => entry.enemyId === target.defId && entry.element === element)) {
      battle.discovered.push({ enemyId: target.defId, element })
    }
    names.push(ELEMENT_NAME[element])
  }
  log(battle, names.length ? `Weak to ${names.join(', ')}.` : 'No weakness.')
}

function tryStatus(battle: BattleState, target: Combatant, hit: Resolving): void {
  if (!hit.status || !target.alive) return
  if (nextUnit(battle) >= hit.status.chance) return
  addStatus(target, hit.status.id, hit.status.turns)
  log(battle, `${target.name} is ${hit.status.id}.`)
}

function applyItem(battle: BattleState, target: Combatant, itemId: string): DamageEvent {
  const item = itemById[itemId]
  const event: DamageEvent = { uid: target.uid, amount: 0, weak: false, heal: true, miss: false, text: '+0' }
  if (!item) return event
  if (item.revive) {
    if (target.alive) return event
    const amount = Math.max(1, item.hp ?? 40)
    target.alive = true
    target.hp = Math.min(target.maxHp, amount)
    event.amount = target.hp
    event.text = `+${target.hp}`
    pushFloater(battle, target, event.text, 'heal')
    log(battle, `${target.name} rises.`)
    return event
  }
  if (!target.alive) return event
  if (item.full) {
    const gained = Math.max(0, target.maxHp - target.hp)
    target.hp = target.maxHp
    target.mp = target.maxMp
    event.amount = gained
    event.text = `+${gained}`
    pushFloater(battle, target, event.text, 'heal')
    return event
  }
  if (typeof item.hp === 'number') {
    const amount = Math.max(0, Math.min(item.hp, target.maxHp - target.hp))
    target.hp += amount
    event.amount = amount
    event.text = `+${amount}`
    pushFloater(battle, target, event.text, 'heal')
  }
  if (typeof item.mp === 'number') {
    const amount = Math.max(0, Math.min(item.mp, target.maxMp - target.mp))
    target.mp += amount
    if (typeof item.hp !== 'number') {
      event.amount = amount
      event.text = `+${amount}`
      pushFloater(battle, target, event.text, 'heal')
    }
  }
  return event
}

function applyHit(battle: BattleState, actor: Combatant, target: Combatant, hit: Resolving): DamageEvent {
  const blank: DamageEvent = { uid: target.uid, amount: 0, weak: false, heal: false, miss: false, text: '0' }
  if (hit.techId === 'read') {
    reveal(battle, target)
    return blank
  }
  if (target.defId === 'stillness' && !hit.heal && !hit.revive) {
    if (battle.enemies.some(enemy => enemy.alive && enemy.defId === 'minute')) {
      log(battle, 'The Stillness has no present to strike.')
      const event = { ...blank, text: 'No present' }
      pushFloater(battle, target, 'No present', 'dmg')
      return event
    }
  }
  if (hit.revive) {
    const amount = Math.max(1, Math.round(8 + (hit.mag * hit.power) / 10))
    target.alive = true
    target.hp = Math.min(target.maxHp, amount)
    const event = { ...blank, amount: target.hp, heal: true, text: `+${target.hp}` }
    pushFloater(battle, target, event.text, 'heal')
    log(battle, `${target.name} rises.`)
    tryStatus(battle, target, hit)
    return event
  }
  if (hit.heal || hit.element === 'heal') {
    const rolled = Math.round(8 + (hit.mag * hit.power) / 10)
    const amount = Math.max(0, Math.min(target.maxHp - target.hp, rolled))
    target.hp += amount
    const event = { ...blank, amount, heal: true, text: `+${amount}` }
    pushFloater(battle, target, event.text, 'heal')
    tryStatus(battle, target, hit)
    return event
  }
  if (hit.power === 0) {
    tryStatus(battle, target, hit)
    return blank
  }
  if (hit.element === 'phys' && actor.statuses.some(status => status.id === 'blind') && nextUnit(battle) < 0.3) {
    const event = { ...blank, miss: true, text: 'MISS' }
    pushFloater(battle, target, 'MISS', 'dmg')
    return event
  }
  const offense = hit.element === 'phys' ? hit.atk : hit.mag
  let raw = (offense * hit.power) / 7 - target.def * 0.45
  let weak = false
  if (target.weaknesses.includes(hit.element)) {
    raw *= 1.65
    weak = true
  } else if (target.resists.includes(hit.element)) {
    raw *= 0.5
  }
  if (target.defending) raw *= 0.5
  if (target.statuses.some(status => status.id === 'protect')) raw *= 0.75
  if (hit.interrupt && target.charging) {
    target.charging = null
    addStatus(target, 'stagger', 1)
    if (raw > 0) raw *= 1.25
    if (!hit.brokeLogged) {
      log(battle, 'Charge broken.')
      hit.brokeLogged = true
    }
  }
  if (hit.ultimate && hit.fray) {
    raw *= 0.35
    if (!hit.frayLogged) {
      log(battle, 'The hour frays.')
      hit.frayLogged = true
    }
  }
  raw *= 0.92 + nextUnit(battle) * 0.16
  let amount = Math.max(1, Math.round(raw))
  if (target.defId === 'stillness' && hit.element !== 'phys' && hit.element === battle.lockedElement) {
    const healed = Math.max(0, Math.min(target.maxHp - target.hp, amount))
    target.hp += healed
    log(battle, `It drinks the ${hit.element}.`)
    const event = { ...blank, amount: healed, heal: true, text: `+${healed}` }
    pushFloater(battle, target, event.text, 'heal')
    tryStatus(battle, target, hit)
    return event
  }
  target.hp = Math.max(0, target.hp - amount)
  if (target.hp <= 0) {
    fell(target)
    log(battle, `${target.name} falls.`)
    amount = Math.max(amount, 1)
  } else {
    tryStatus(battle, target, hit)
  }
  if (target.defId === 'stillness' && target.alive && amount > 0 && hit.element !== 'phys') {
    battle.lockedElement = hit.element
    log(battle, `The Stillness locks ${ELEMENT_NAME[hit.element]}.`)
  }
  const event = { ...blank, amount, weak, text: String(amount) }
  pushFloater(battle, target, event.text, weak ? 'weak' : 'dmg')
  return event
}

function applyResolving(battle: BattleState): void {
  const plan = bagOf(battle).resolving
  const anim = battle.anim
  if (!plan || !anim) return
  const actors = plan.actorUids.map(uid => findUid(battle, uid)).filter((unit): unit is Combatant => !!unit)
  const actor = actors[0]
  if (!actor) return
  const targets = plan.targetUids.map(uid => findUid(battle, uid)).filter((unit): unit is Combatant => !!unit)
  if (plan.itemId) {
    for (const target of targets) anim.damages.push(applyItem(battle, target, plan.itemId))
    return
  }
  if (plan.techId === 'read') {
    for (const target of targets) reveal(battle, target)
    return
  }
  for (const target of targets) {
    if (!target.alive && !plan.revive) continue
    anim.damages.push(applyHit(battle, actor, target, plan))
  }
}

function finishResolve(battle: BattleState): void {
  const plan = bagOf(battle).resolving
  if (plan) {
    for (const uid of plan.actorUids) {
      const unit = findUid(battle, uid)
      if (unit) decStatuses(unit)
    }
  }
  bagOf(battle).resolving = null
  battle.anim = null
  maybeSpawnHour(battle)
  if (!checkEnd(battle)) {
    battle.phase = 'run'
    battle.actorUid = null
    battle.pendingTech = null
  }
}

function stepResolve(battle: BattleState, dt: number): void {
  const anim = battle.anim
  if (!anim) {
    battle.phase = 'run'
    return
  }
  anim.t += dt
  if (!anim.applied && anim.t >= anim.hitAt) {
    anim.applied = true
    applyResolving(battle)
  }
  if (battle.anim && battle.anim.t >= battle.anim.dur) finishResolve(battle)
}

function weighted(battle: BattleState, skills: EnemySkill[]): EnemySkill {
  const total = skills.reduce((sum, skill) => sum + skill.weight, 0)
  let roll = nextUnit(battle) * (total > 0 ? total : 1)
  for (const skill of skills) {
    roll -= skill.weight
    if (roll <= 0) return skill
  }
  return skills[skills.length - 1]
}

function pickSkill(battle: BattleState, enemy: Combatant): EnemySkill | null {
  const def = enemyById[enemy.defId]
  if (!def || def.skills.length === 0) return null
  let pool = def.skills.slice()
  if (enemy.maxHp > 0 && enemy.hp / enemy.maxHp < 0.4) {
    const heals = pool.filter((skill: EnemySkill) => skill.heal)
    if (heals.length) pool = heals
  }
  if (battle.enemies.some(other => other.alive && other.uid !== enemy.uid && other.charging?.ultimate)) {
    pool = pool.filter((skill: EnemySkill) => !skill.ultimate)
  }
  if (!pool.length) return null
  return weighted(battle, pool)
}

function lowest(list: Combatant[]): Combatant[] {
  if (!list.length) return []
  let best = list[0]
  let ratio = best.maxHp > 0 ? best.hp / best.maxHp : 0
  for (const unit of list) {
    const next = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0
    if (next < ratio) {
      best = unit
      ratio = next
    }
  }
  return [best]
}

function randomOne(battle: BattleState, list: Combatant[]): Combatant[] {
  if (!list.length) return []
  const index = Math.min(list.length - 1, Math.floor(nextUnit(battle) * list.length))
  return [list[index]]
}

function skillTargets(battle: BattleState, actor: Combatant, skill: EnemySkill): Combatant[] {
  const friends = living(actor.kind === 'enemy' ? battle.enemies : battle.allies)
  const foes = living(actor.kind === 'enemy' ? battle.allies : battle.enemies)
  if (skill.target === 'self') return actor.alive ? [actor] : []
  if (skill.heal && (skill.target === 'ally' || skill.target === 'enemy')) return lowest(friends)
  if (skill.target === 'all-allies') return friends
  if (skill.target === 'all-enemies') return foes
  if (skill.target === 'ally') return randomOne(battle, friends)
  return randomOne(battle, foes)
}

function targetsForTech(battle: BattleState, actor: Combatant, tech: TechDef): Combatant[] {
  if (tech.revive) {
    if (tech.target === 'self') return actor.alive ? [] : [actor]
    if (tech.target === 'enemy' || tech.target === 'all-enemies') return battle.enemies.filter(unit => !unit.alive)
    return battle.allies.filter(unit => !unit.alive)
  }
  if (tech.target === 'self') return actor.alive ? [actor] : []
  if (tech.target === 'enemy' || tech.target === 'all-enemies') return living(battle.enemies)
  return living(battle.allies)
}

function needsAim(target: TechDef['target']): boolean {
  return target === 'enemy' || target === 'ally'
}

function openMenu(battle: BattleState, ally: Combatant): void {
  battle.phase = 'command'
  battle.menu = 'root'
  battle.menuIndex = 0
  battle.targetIndex = 0
  battle.actorUid = ally.uid
  bagOf(battle).pending = null
}

function consumeStagger(battle: BattleState, unit: Combatant): boolean {
  if (!unit.statuses.some(status => status.id === 'stagger')) return false
  unit.statuses = unit.statuses.filter(status => status.id !== 'stagger')
  unit.atb = 0
  unit.charging = null
  log(battle, `${unit.name} staggers.`)
  return true
}

function fireCharge(battle: BattleState, enemy: Combatant): void {
  const skillId = enemy.charging?.skillId
  const skill = enemyById[enemy.defId]?.skills.find((entry: EnemySkill) => entry.id === skillId)
  enemy.charging = null
  if (!skill) return
  const targets = skillTargets(battle, enemy, skill)
  if (!targets.length) {
    log(battle, 'No target.')
    return
  }
  beginResolve(battle, [enemy], planSkill(battle, enemy, skill, targets))
}

function startEnemyTurn(battle: BattleState, enemy: Combatant): void {
  const skill = pickSkill(battle, enemy)
  if (!skill) {
    enemy.atb = 0
    return
  }
  if (skill.charge > 0) {
    enemy.atb = 0
    enemy.acted = true
    enemy.defending = false
    enemy.charging = {
      skillId: skill.id,
      name: skill.name,
      t: 0,
      dur: skill.charge,
      ultimate: skill.ultimate,
    }
    log(battle, `${enemy.name} readies ${skill.name}.`)
    return
  }
  const targets = skillTargets(battle, enemy, skill)
  if (!targets.length) {
    enemy.atb = 0
    log(battle, 'No target.')
    return
  }
  beginResolve(battle, [enemy], planSkill(battle, enemy, skill, targets))
}

function runPhase(battle: BattleState): void {
  const charging = battle.enemies.find(enemy => enemy.alive && enemy.charging && enemy.charging.t >= enemy.charging.dur - 1e-9)
  if (charging) {
    if (consumeStagger(battle, charging)) return
    fireCharge(battle, charging)
    return
  }
  for (const ally of battle.allies) {
    if (!ally.alive || ally.atb < 100) continue
    if (consumeStagger(battle, ally)) continue
    openMenu(battle, ally)
    return
  }
  for (const enemy of battle.enemies) {
    if (!enemy.alive || enemy.atb < 100 || enemy.charging) continue
    if (consumeStagger(battle, enemy)) continue
    startEnemyTurn(battle, enemy)
    return
  }
}

function comboUsers(battle: BattleState, tech: TechDef): Combatant[] | null {
  const users: Combatant[] = []
  for (const id of tech.users) {
    const member = memberById(battle, id)
    if (!member || !member.alive) return null
    users.push(member)
  }
  return users
}

function resolveComboTargets(battle: BattleState, users: Combatant[], tech: TechDef): Combatant[] {
  const chosen = bagOf(battle).chosenUid
  if (chosen) {
    const target = findUid(battle, chosen)
    if (!target) return []
    if (tech.revive) return target.alive ? [] : [target]
    return target.alive ? [target] : []
  }
  return targetsForTech(battle, users[0], tech)
}

function pollCombo(battle: BattleState): void {
  const techId = battle.pendingTech
  const tech = techId ? techById[techId] : undefined
  if (!tech) {
    battle.phase = 'run'
    battle.pendingTech = null
    return
  }
  const users = comboUsers(battle, tech)
  if (!users) {
    battle.phase = 'run'
    battle.pendingTech = null
    battle.actorUid = null
    log(battle, 'The combo broke.')
    return
  }
  if (!users.every(user => user.atb >= 100 && user.mp >= tech.mp)) return
  const targets = resolveComboTargets(battle, users, tech)
  bagOf(battle).chosenUid = null
  if (!targets.length) {
    battle.phase = 'run'
    battle.pendingTech = null
    battle.actorUid = null
    log(battle, 'No one to target.')
    return
  }
  beginResolve(battle, users, planTech(users, tech, targets))
}

function enterComboWait(battle: BattleState, tech: TechDef): void {
  battle.pendingTech = tech.id
  battle.phase = 'combo-wait'
  battle.menu = 'root'
  pollCombo(battle)
}

function rootRows(battle: BattleState, actor: Combatant): CommandRow[] {
  const combo = allTechs().some(tech => comboReady(battle, actor, tech))
  const boss = battle.enemies.some(enemy => enemy.alive && enemy.boss)
  return [
    { id: 'attack', label: 'Attack' },
    { id: 'open-tech', label: 'Techs' },
    { id: 'open-combo', label: 'Combo', disabled: !combo },
    { id: 'open-item', label: 'Item' },
    { id: 'defend', label: 'Defend' },
    {
      id: 'echo',
      label: 'Echo',
      detail: `${battle.echoes}/${battle.echoMax}`,
      disabled: battle.echoes <= 0 || battle.history.length === 0,
    },
    { id: 'flee', label: 'Flee', disabled: boss },
  ]
}

function techRows(battle: BattleState, actor: Combatant, combo: boolean): CommandRow[] {
  const rows: CommandRow[] = []
  for (const tech of allTechs()) {
    if (combo) {
      if (!comboReady(battle, actor, tech)) continue
      const users = comboUsers(battle, tech) ?? []
      rows.push({
        id: `tech:${tech.id}`,
        label: tech.name,
        detail: `${tech.mp} MP`,
        disabled: users.some(user => user.mp < tech.mp),
      })
    } else if (tech.users.length === 1 && actor.characterId && tech.users.includes(actor.characterId) && techUnlocked(battle, tech)) {
      rows.push({
        id: `tech:${tech.id}`,
        label: tech.name,
        detail: `${tech.mp} MP`,
        disabled: actor.mp < tech.mp,
      })
    }
  }
  return rows
}

function itemRows(battle: BattleState): CommandRow[] {
  const inventory = bagOf(battle).inventory
  const rows: CommandRow[] = []
  const seen = new Set<string>()
  for (const item of allItems()) {
    const count = inventory[item.id] ?? 0
    if (count <= 0 || item.kind !== 'consumable') continue
    seen.add(item.id)
    rows.push({ id: `item:${item.id}`, label: item.name, detail: `${count}` })
  }
  for (const [id, count] of Object.entries(inventory)) {
    if (seen.has(id) || count <= 0) continue
    const item = itemById[id]
    if (!item || item.kind !== 'consumable') continue
    rows.push({ id: `item:${id}`, label: item.name, detail: `${count}` })
  }
  return rows
}

export function currentCommands(battle: BattleState): CommandRow[] {
  const actor = actorOf(battle)
  if (!actor) return []
  if (battle.menu === 'tech') return techRows(battle, actor, false)
  if (battle.menu === 'combo') return techRows(battle, actor, true)
  if (battle.menu === 'item') return itemRows(battle)
  return rootRows(battle, actor)
}

function itemTargets(battle: BattleState, item: ItemDef): Combatant[] {
  if (item.revive) return battle.allies.filter(unit => !unit.alive)
  return living(battle.allies)
}

export function currentTargets(battle: BattleState): { id: string; label: string }[] {
  if (battle.phase !== 'target') return []
  const actor = actorOf(battle)
  const pending = bagOf(battle).pending
  if (!actor || !pending) return []
  let list: Combatant[] = []
  if (pending.kind === 'attack') list = living(battle.enemies)
  else if (pending.kind === 'tech') {
    const tech = techById[pending.techId]
    if (tech) list = targetsForTech(battle, actor, tech)
  } else {
    const item = itemById[pending.itemId]
    if (item) list = itemTargets(battle, item)
  }
  return list.map(unit => ({ id: unit.uid, label: unit.name }))
}

function chooseAttack(battle: BattleState): void {
  if (!living(battle.enemies).length) {
    log(battle, 'No one to target.')
    return
  }
  bagOf(battle).pending = { kind: 'attack' }
  battle.phase = 'target'
  battle.targetSide = 'enemy'
  battle.targetIndex = 0
  battle.pendingTech = null
}

function chooseTech(battle: BattleState, actor: Combatant, techId: string): void {
  const tech = techById[techId]
  if (!tech || !actor.characterId || !tech.users.includes(actor.characterId)) return
  if (!techUnlocked(battle, tech)) return
  if (tech.users.length > 1) {
    if (!comboReady(battle, actor, tech)) return
    const users = comboUsers(battle, tech)
    if (!users) {
      log(battle, 'The combo broke.')
      return
    }
    if (users.some(user => user.mp < tech.mp)) {
      log(battle, 'Not enough MP.')
      return
    }
    if (needsAim(tech.target)) {
      const pool = targetsForTech(battle, actor, tech)
      if (!pool.length) {
        log(battle, 'No one to target.')
        return
      }
      bagOf(battle).pending = { kind: 'tech', techId: tech.id, combo: true }
      battle.phase = 'target'
      battle.targetSide = tech.target === 'enemy' ? 'enemy' : 'ally'
      battle.targetIndex = 0
      battle.pendingTech = tech.id
      return
    }
    enterComboWait(battle, tech)
    return
  }
  if (actor.mp < tech.mp) return
  const pool = targetsForTech(battle, actor, tech)
  if (!pool.length) {
    log(battle, 'No one to target.')
    return
  }
  if (needsAim(tech.target)) {
    bagOf(battle).pending = { kind: 'tech', techId: tech.id, combo: false }
    battle.phase = 'target'
    battle.targetSide = tech.target === 'enemy' ? 'enemy' : 'ally'
    battle.targetIndex = 0
    battle.pendingTech = tech.id
    return
  }
  beginResolve(battle, [actor], planTech([actor], tech, pool))
}

function chooseItem(battle: BattleState, itemId: string): void {
  const item = itemById[itemId]
  if (!item || item.kind !== 'consumable' || (bagOf(battle).inventory[itemId] ?? 0) <= 0) return
  const pool = itemTargets(battle, item)
  if (!pool.length) {
    log(battle, 'No one to target.')
    return
  }
  bagOf(battle).pending = { kind: 'item', itemId }
  battle.phase = 'target'
  battle.targetSide = 'ally'
  battle.targetIndex = 0
}

function confirmTarget(battle: BattleState, uid: string): void {
  const actor = actorOf(battle)
  const pending = bagOf(battle).pending
  const target = findUid(battle, uid)
  if (!actor || !pending || !target) return
  if (pending.kind === 'attack') {
    if (!target.alive) return
    beginResolve(battle, [actor], planAttack(actor, [target]))
    return
  }
  if (pending.kind === 'tech') {
    const tech = techById[pending.techId]
    if (!tech) return
    if (pending.combo) {
      bagOf(battle).chosenUid = uid
      enterComboWait(battle, tech)
      return
    }
    beginResolve(battle, [actor], planTech([actor], tech, [target]))
    return
  }
  const item = itemById[pending.itemId]
  if (!item) return
  beginResolve(battle, [actor], planItem(actor, item, [target]))
}

function tryFlee(battle: BattleState, actor: Combatant): void {
  if (battle.enemies.some(enemy => enemy.alive && enemy.boss)) {
    log(battle, 'No path.')
    return
  }
  if (!tickPoison(battle, actor)) {
    battle.actorUid = null
    if (!checkEnd(battle)) battle.phase = 'run'
    return
  }
  if (nextUnit(battle) < 0.7) {
    battle.phase = 'flee'
    battle.result = 'flee'
    battle.actorUid = null
    battle.banner = 'Fled'
    battle.bannerT = 1.2
    return
  }
  actor.atb = 0
  actor.defending = false
  battle.phase = 'run'
  battle.actorUid = null
  battle.menu = 'root'
  log(battle, 'The way is shut.')
}

function doEcho(battle: BattleState): void {
  if (battle.echoes <= 0 || battle.history.length === 0) return
  const shot = battle.history.pop()
  if (!shot) return
  battle.allies = shot.allies
  battle.enemies = shot.enemies
  battle.lockedElement = shot.lockedElement
  battle.hourSpawned = shot.hourSpawned
  battle.log = shot.log.slice()
  battle.echoes -= 1
  battle.anim = null
  battle.phase = 'run'
  battle.actorUid = null
  battle.pendingTech = null
  battle.floaters = []
  battle.banner = 'Rewound'
  battle.bannerT = 1.2
  battle.result = 'ongoing'
  battle.menu = 'root'
  battle.menuIndex = 0
  battle.rewards = { xp: 0, gold: 0, items: [], levels: [] }
  const bag = bagOf(battle)
  bag.pending = null
  bag.resolving = null
  bag.chosenUid = null
  for (const enemy of battle.enemies) {
    if (enemy.charging && enemy.charging.t >= enemy.charging.dur) enemy.charging = null
  }
  log(battle, 'The Echo Lens pulls the second back.')
}

export function tickBattle(battle: BattleState, dt: number): void {
  ageFloaters(battle, dt)
  if (battle.phase === 'victory' || battle.phase === 'defeat' || battle.phase === 'flee') {
    if (battle.bannerT > 0) battle.bannerT = Math.max(0, battle.bannerT - dt)
    return
  }
  if (battle.phase === 'intro') {
    battle.bannerT -= dt
    if (battle.bannerT > 0) return
    battle.bannerT = 0
    battle.banner = ''
    battle.phase = 'run'
  } else if (battle.bannerT > 0) {
    battle.bannerT = Math.max(0, battle.bannerT - dt)
  }
  if (canFill(battle)) {
    fillAtb(battle, dt)
    advanceCharges(battle, dt)
  }
  if (battle.phase === 'combo-wait') pollCombo(battle)
  else if (battle.phase === 'resolve') stepResolve(battle, dt)
  else if (battle.phase === 'run') runPhase(battle)
}

export function battleCommand(battle: BattleState, id: string): void {
  if (id === 'echo') {
    doEcho(battle)
    return
  }
  if (battle.phase === 'victory' || battle.phase === 'defeat' || battle.phase === 'flee' || battle.phase === 'intro' || battle.phase === 'resolve' || battle.phase === 'combo-wait') {
    return
  }
  if (battle.phase === 'run') {
    const ready = battle.allies.find(unit => unit.alive && unit.atb >= 100)
    if (!ready) return
    openMenu(battle, ready)
  }
  if (battle.phase !== 'command' && battle.phase !== 'target') return
  const actor = actorOf(battle)
  if (!actor || !actor.alive) return
  if (id === 'open-tech') {
    battle.phase = 'command'
    battle.menu = 'tech'
    battle.menuIndex = 0
    return
  }
  if (id === 'open-item') {
    battle.phase = 'command'
    battle.menu = 'item'
    battle.menuIndex = 0
    return
  }
  if (id === 'open-combo') {
    if (!allTechs().some(tech => comboReady(battle, actor, tech))) return
    battle.phase = 'command'
    battle.menu = 'combo'
    battle.menuIndex = 0
    return
  }
  if (id === 'attack') {
    chooseAttack(battle)
    return
  }
  if (id === 'defend') {
    beginResolve(battle, [actor], planDefend(actor))
    return
  }
  if (id === 'flee') {
    tryFlee(battle, actor)
    return
  }
  if (id.startsWith('tech:')) {
    chooseTech(battle, actor, id.slice(5))
    return
  }
  if (id.startsWith('item:')) chooseItem(battle, id.slice(5))
}

export function battleConfirm(battle: BattleState): void {
  if (battle.phase === 'target') {
    const list = currentTargets(battle)
    if (!list.length) return
    confirmTarget(battle, list[mod(battle.targetIndex, list.length)].id)
    return
  }
  if (battle.phase !== 'command') return
  const rows = currentCommands(battle)
  if (!rows.length) return
  const row = rows[mod(battle.menuIndex, rows.length)]
  if (!row || row.disabled) return
  battleCommand(battle, row.id)
}

export function battleCancel(battle: BattleState): void {
  const bag = bagOf(battle)
  if (battle.phase === 'combo-wait') {
    battle.phase = 'run'
    battle.pendingTech = null
    battle.actorUid = null
    battle.menu = 'root'
    battle.menuIndex = 0
    bag.pending = null
    bag.chosenUid = null
    return
  }
  if (battle.phase === 'target' || (battle.phase === 'command' && battle.menu !== 'root')) {
    battle.phase = 'command'
    battle.menu = 'root'
    battle.menuIndex = 0
    battle.pendingTech = null
    bag.pending = null
    bag.chosenUid = null
  }
}

export function battleMove(battle: BattleState, dir: -1 | 1): void {
  if (battle.phase === 'target') {
    const count = currentTargets(battle).length
    if (count > 0) battle.targetIndex = mod(battle.targetIndex + dir, count)
    return
  }
  if (battle.phase === 'command') {
    const count = currentCommands(battle).length
    if (count > 0) battle.menuIndex = mod(battle.menuIndex + dir, count)
  }
}

function readPhase(battle: BattleState): BattleState['phase'] {
  return battle.phase
}

export function selfTest(): void {
  if (xpToNext(1) !== 30) throw new Error('xpToNext(1) should be 30')
  const kael = makeMember('kael', 1)
  if (kael.hp !== maxHp(kael)) throw new Error('level 1 hp should match max')
  const wounded = { ...kael, hp: Math.min(1, kael.hp) }
  const gained = grantXp([wounded], xpToNext(1))
  if (gained.party[0].level <= wounded.level) throw new Error('grantXp should raise level')
  if (gained.party[0].hp !== maxHp(gained.party[0])) throw new Error('grantXp should fill hp')

  const battle = createBattle([makeMember('kael', 3)], ['gnatcoil'], {
    mode: 'wait',
    speed: 1,
    echoMax: 1,
    ambush: 'player',
    tutorial: true,
    bestiary: {},
    unlocked: ['sever'],
    inventory: { tonic: 1 },
  } as BattleCreateOpts)
  const enemyMax = battle.enemies[0]?.maxHp ?? 0
  if (!battle.enemies[0]) throw new Error('missing gnatcoil')
  battle.allies[0].atb = 100
  battle.phase = 'run'
  tickBattle(battle, 0.05)
  battleCommand(battle, 'attack')
  if (readPhase(battle) === 'target') battleConfirm(battle)
  if (readPhase(battle) !== 'resolve') throw new Error(`expected resolve, got ${readPhase(battle)}`)
  let steps = 0
  while (readPhase(battle) === 'resolve' && steps < 50) {
    tickBattle(battle, 0.1)
    steps += 1
  }
  if (readPhase(battle) === 'resolve') throw new Error('resolve did not finish')
  if (!(battle.enemies[0].hp < enemyMax)) throw new Error('attack should lower enemy hp')
  if (battle.history.length === 0) throw new Error('history should record the attack')
  const damaged = battle.enemies[0].hp
  battleCommand(battle, 'echo')
  if (battle.enemies[0].hp !== enemyMax) throw new Error('echo should restore enemy hp')
  if (!(battle.enemies[0].hp > damaged)) throw new Error('restored hp should exceed the hit')
  if (battle.echoes !== 0) throw new Error('echo should spend the charge')

  const still = createBattle([makeMember('kael', 5)], ['stillness', 'minute'], {
    mode: 'wait',
    speed: 1,
    echoMax: 0,
    ambush: 'fair',
    bestiary: {},
  })
  const stillness = still.enemies.find(enemy => enemy.defId === 'stillness')
  const minute = still.enemies.find(enemy => enemy.defId === 'minute')
  if (!stillness || !minute || !minute.alive) throw new Error('stillness setup missing')
  const before = stillness.hp
  const ally = still.allies[0]
  applyHit(still, ally, stillness, planAttack(ally, [stillness]))
  if (stillness.hp !== before) throw new Error('stillness should ignore hits while a minute lives')
}
