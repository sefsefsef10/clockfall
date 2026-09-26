import { TILE } from './const.ts'
import {
  characters,
  enemyById,
  gates,
  itemById,
  maps,
  puzzles,
  scripts,
  shops,
} from './content/index.ts'
import { createAudio } from './engine/audio.ts'
import { attachInput } from './engine/input.ts'
import { drawBattle } from './render/battle.ts'
import { drawEnding, drawTitle } from './render/title.ts'
import { drawWorld } from './render/world.ts'
import {
  battleCancel,
  battleCommand,
  battleConfirm,
  battleMove,
  createBattle,
  currentCommands,
  currentTargets,
  tickBattle,
} from './systems/battle.ts'
import { createField, fieldCamera, tickField } from './systems/field.ts'
import { chronicleRows } from './systems/journal.ts'
import {
  hasManualSave,
  loadAuto,
  loadManual,
  newGame,
  saveAuto,
  saveManual,
} from './systems/save.ts'
import {
  combatNumbers,
  equip,
  grantXp,
  healParty,
  makeMember,
  maxHp,
  maxMp,
} from './systems/stats.ts'
import type {
  ActorDraw,
  BattleCreateOpts,
  BattleDrawActor,
  BattleState,
  CharacterId,
  Chest,
  Dir,
  Element,
  Era,
  FieldState,
  ItemDef,
  MapId,
  MemberState,
  MenuModel,
  MusicId,
  PortraitId,
  SaveData,
  ScriptStep,
  Settings,
  ShopModel,
  UiModel,
} from './types.ts'
import { mountUi } from './ui/ui.ts'

type Screen =
  | { id: 'root' }
  | { id: 'party' }
  | { id: 'items' }
  | { id: 'pick'; item: string }
  | { id: 'equip' }
  | { id: 'equip-slot'; who: CharacterId }
  | { id: 'equip-pick'; who: CharacterId; slot: 'weapon' | 'armor' }
  | { id: 'techs' }
  | { id: 'lore' }
  | { id: 'chronicle' }

type ScriptRun = { steps: ScriptStep[]; index: number }

const ENDING = [
  'Clockfall',
  'The second hand finishes the sweep it started this morning.',
  'In Leorain the fair remembers its own song. The bell tower strikes one, and then two, and nobody looks up afraid.',
  'Ashspire keeps its scars, but the clocks there run. Mira leaves a note on the cathedral door: still late, still walking.',
  'Crownkeep raises a banner that is only a banner. Torin sets the hammer down long enough to hear the hour.',
  'Kael stays through the rest of the fair. He buys a tonic he does not need. The clock owes him nothing, and it pays anyway.',
  'The dial turns. That is the whole trick.',
]

const FOLLOWUP: Record<string, string> = {
  hound_dead: 'after_hound',
  saint_dead: 'after_saint',
}

const audio = createAudio()
const input = attachInput(document.body)

let mode: UiModel['mode'] = 'title'
let overlay: UiModel['overlay'] = 'none'
let save: SaveData | null = null
let field: FieldState | null = null
let battle: BattleState | null = null
let battleFromScript = false
let battleInstance = ''
let battleFlag = ''
let battleSettled = false
let afterRewards: string | null = null
let script: ScriptRun | null = null
let dialogue: { speaker: string; portrait: PortraitId; text: string } | null = null
let screen: Screen = { id: 'root' }
let menuIndex = 0
let shopIndex = 0
let shopId = ''
let gateIndex = 0
let settingsFrom: 'title' | 'menu' = 'title'
let titleSettings: Settings = {
  atb: 'wait',
  speed: 1.5,
  volume: 0.7,
  shake: true,
  text: 'mid',
}
let announce: { kicker?: string; title: string } | null = null
let announceT = 0
let manualExists = false
let clearedStamp = false
let clock = 0
let navDir = 0
let navTimer = 0
let animWasOn = false
let musicBack = 0
let lastMusic: MusicId | null = null

function aliveSettings(): Settings {
  return save?.settings ?? titleSettings
}

export function startGame(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#view')
  const root = document.querySelector<HTMLElement>('#ui')
  if (!canvas || !root) throw new Error('Clockfall is missing its stage.')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.imageSmoothingEnabled = false

  manualExists = hasManualSave()
  clearedStamp = loadManual()?.cleared ?? false
  const ui = mountUi(root, {
    newGame: () => begin(newGame(titleSettings)),
    continueGame: () => {
      const loaded = loadManual()
      if (loaded) begin(loaded)
    },
    confirm: () => pressConfirm(),
    cancel: () => pressCancel(),
    select: (id) => choose(id),
    setSetting: (key, value) => applySetting(key, value),
    move: (x, y) => input.setMove(x, y),
    press: (action) => {
      audio.unlock()
      input.press(action)
    },
  })

  audio.playMusic('title')
  lastMusic = 'title'
  let prev = performance.now()
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - prev) / 1000)
    prev = now
    clock += dt
    step(dt)
    paint(ctx)
    ui.render(view())
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function begin(data: SaveData): void {
  save = data
  battle = null
  script = null
  dialogue = null
  overlay = 'none'
  mode = 'play'
  field = createField(save)
  audio.unlock()
  audio.setVolume(save.settings.volume)
  playMusic(maps[save.map].music)
  announcePlace()
  saveAuto(save)
}

function toTitle(): void {
  mode = 'title'
  overlay = 'none'
  battle = null
  field = null
  script = null
  dialogue = null
  playMusic('title')
}

function retry(): void {
  const data = loadAuto() ?? loadManual()
  if (data) begin(data)
  else begin(newGame(titleSettings))
}

function step(dt: number): void {
  const frame = input.read()
  if (frame.confirm || frame.cancel || frame.menu || frame.x || frame.y) audio.unlock()
  if (announceT > 0) {
    announceT -= dt
    if (announceT <= 0) announce = null
  }
  if (musicBack > 0) {
    musicBack -= dt
    if (musicBack <= 0 && mode === 'play' && field && !battle) playMusic(maps[field.mapId].music)
  }
  if (save && mode === 'play') save.playtime += dt

  if (dialogue && (frame.confirm || frame.cancel)) {
    dialogue = null
    audio.sfx('confirm')
    advanceScript()
    return
  }

  if (overlay !== 'none') {
    const nav = pollNav(frame.y, dt)
    if (nav) movePanel(nav)
    if (frame.cancel) pressCancel()
    else if (frame.confirm) pressConfirm()
    else if (frame.menu && overlay === 'menu' && screen.id === 'root') closePanels()
    return
  }

  if (mode === 'title') {
    if (frame.confirm) begin(newGame(titleSettings))
    return
  }

  if (mode === 'gameover') {
    if (frame.confirm) retry()
    return
  }

  if (mode === 'ending') return

  if (battle) {
    tickBattle(battle, dt)
    noteBattleSound()
    if (save) {
      battle.mode = save.settings.atb
      battle.speed = save.settings.speed
    }
    if (!battleSettled && battle.result !== 'ongoing') settleBattle()
    if (overlay !== 'none') return
    if (frame.rewind) {
      battleCommand(battle, 'echo')
      audio.sfx('rewind')
    }
    const nav = pollNav(frame.y, dt)
    if (nav) {
      battleMove(battle, nav)
      audio.sfx('cursor')
    }
    if (frame.cancel) battleCancel(battle)
    if (frame.confirm) battleConfirm(battle)
    return
  }

  if (!field || !save) return
  if (script) return

  if (frame.menu) {
    openMenu()
    return
  }
  const events = tickField(field, save, frame, dt)
  for (const event of events) handleField(event)
}

function pollNav(y: number, dt: number): -1 | 0 | 1 {
  if (y === 0) {
    navDir = 0
    navTimer = 0
    return 0
  }
  const dir: -1 | 1 = y < 0 ? -1 : 1
  if (dir !== navDir) {
    navDir = dir
    navTimer = 0.28
    return dir
  }
  navTimer -= dt
  if (navTimer <= 0) {
    navTimer = 0.13
    return dir
  }
  return 0
}

function movePanel(dir: -1 | 1): void {
  audio.sfx('cursor')
  if (overlay === 'menu' || overlay === 'rewards') {
    const rows = currentMenu().rows.length
    menuIndex = (menuIndex + dir + rows) % Math.max(1, rows)
  } else if (overlay === 'shop') {
    const count = currentShop().rows.length
    shopIndex = (shopIndex + dir + count) % Math.max(1, count)
  } else if (overlay === 'gate') {
    const count = currentGate().rows.length
    gateIndex = (gateIndex + dir + count) % Math.max(1, count)
  }
}

function pressConfirm(): void {
  audio.unlock()
  if (dialogue) {
    dialogue = null
    audio.sfx('confirm')
    advanceScript()
    return
  }
  if (overlay === 'menu' || overlay === 'rewards') {
    const row = currentMenu().rows[menuIndex]
    if (row && !row.disabled) choose(row.id)
    return
  }
  if (overlay === 'shop') {
    const row = currentShop().rows[shopIndex]
    if (row && !row.disabled) choose(row.id)
    return
  }
  if (overlay === 'gate') {
    const row = currentGate().rows[gateIndex]
    if (row && !row.disabled) choose(row.id)
    return
  }
  if (overlay === 'settings') {
    pressCancel()
    return
  }
  if (mode === 'title') begin(newGame(titleSettings))
  else if (mode === 'gameover') retry()
  else if (battle && overlay === 'none') battleConfirm(battle)
}

function pressCancel(): void {
  audio.sfx('cancel')
  if (dialogue) {
    dialogue = null
    advanceScript()
    return
  }
  if (overlay === 'settings') {
    overlay = settingsFrom === 'menu' && mode === 'play' ? 'menu' : 'none'
    if (overlay === 'none') screen = { id: 'root' }
    return
  }
  if (overlay === 'shop' || overlay === 'gate' || overlay === 'rewards') {
    if (overlay === 'rewards') closeRewards()
    else closePanels()
    return
  }
  if (overlay === 'menu') {
    if (screen.id !== 'root') {
      screen = parentScreen(screen)
      menuIndex = 0
      return
    }
    closePanels()
    return
  }
  if (battle && overlay === 'none') battleCancel(battle)
}

function choose(id: string): void {
  audio.unlock()
  audio.sfx('confirm')
  if (mode === 'ending' && id === 'title') {
    toTitle()
    return
  }
  if (mode === 'gameover') {
    if (id === 'retry') retry()
    if (id === 'title') toTitle()
    return
  }
  if (mode === 'title' && id === 'settings') {
    settingsFrom = 'title'
    overlay = 'settings'
    return
  }
  if (battle && overlay === 'none') {
    if (battle.phase === 'target') {
      const targets = currentTargets(battle)
      let idx = targets.findIndex((row) => row.id === id)
      if (idx < 0 && id.startsWith('t:')) idx = Number(id.slice(2))
      if (idx >= 0) {
        battle.targetIndex = idx
        battleConfirm(battle)
      }
      return
    }
    battleCommand(battle, id)
    return
  }
  if (overlay === 'rewards') {
    closeRewards()
    return
  }
  if (overlay === 'shop') {
    if (id.startsWith('buy:')) buy(id.slice(4))
    return
  }
  if (overlay === 'gate') {
    if (id.startsWith('gate:')) travel(id.slice(5))
    return
  }
  if (overlay === 'menu') menuAction(id)
}

function menuAction(id: string): void {
  if (!save) return
  if (id === 'menu-close' || id === 'back') {
    if (screen.id === 'root' || id === 'menu-close') closePanels()
    else {
      screen = parentScreen(screen)
      menuIndex = 0
    }
    return
  }
  if (id === 'nav-party') {
    screen = { id: 'party' }
    menuIndex = 0
    return
  }
  if (id === 'nav-items') {
    screen = { id: 'items' }
    menuIndex = 0
    return
  }
  if (id === 'nav-equip') {
    screen = { id: 'equip' }
    menuIndex = 0
    return
  }
  if (id === 'nav-techs') {
    screen = { id: 'techs' }
    menuIndex = 0
    return
  }
  if (id === 'nav-lore') {
    screen = { id: 'lore' }
    menuIndex = 0
    return
  }
  if (id === 'nav-chronicle') {
    screen = { id: 'chronicle' }
    menuIndex = 0
    return
  }
  if (id === 'nav-settings') {
    settingsFrom = 'menu'
    overlay = 'settings'
    return
  }
  if (id === 'do-save') {
    saveManual(save)
    saveAuto(save)
    manualExists = true
    toast('Saved')
    audio.sfx('confirm')
    return
  }
  if (id.startsWith('use:')) {
    screen = { id: 'pick', item: id.slice(4) }
    menuIndex = 0
    return
  }
  if (id.startsWith('target:') && screen.id === 'pick') {
    const who = id.slice(7) as CharacterId
    const member = save.party.find((p) => p.id === who)
    const item = itemById[screen.item]
    if (!member || !item) return
    if (!applyItem(member, item)) {
      toast('It would do nothing')
      return
    }
    save.inventory[item.id] = Math.max(0, (save.inventory[item.id] ?? 1) - 1)
    audio.sfx('heal')
    screen = { id: 'items' }
    menuIndex = 0
    return
  }
  if (id.startsWith('who:')) {
    screen = { id: 'equip-slot', who: id.slice(4) as CharacterId }
    menuIndex = 0
    return
  }
  if ((id === 'slot:weapon' || id === 'slot:armor') && screen.id === 'equip-slot') {
    screen = { id: 'equip-pick', who: screen.who, slot: id === 'slot:weapon' ? 'weapon' : 'armor' }
    menuIndex = 0
    return
  }
  if (id.startsWith('gear:') && screen.id === 'equip-pick') {
    const result = equip(save.party, save.gear, screen.who, screen.slot, id.slice(5))
    if (!result.ok) {
      toast(result.error)
      return
    }
    save.party = result.party
    save.gear = result.gear
    audio.sfx('confirm')
    toast('Equipped')
  }
}

function parentScreen(current: Screen): Screen {
  if (current.id === 'pick') return { id: 'items' }
  if (current.id === 'equip-slot') return { id: 'equip' }
  if (current.id === 'equip-pick') return { id: 'equip-slot', who: current.who }
  return { id: 'root' }
}

function openMenu(): void {
  if (!save || battle || dialogue || script) return
  screen = { id: 'root' }
  menuIndex = 0
  overlay = 'menu'
  audio.sfx('click')
}

function closePanels(): void {
  overlay = 'none'
  shopId = ''
}

function handleField(event: ReturnType<typeof tickField>[number]): void {
  if (!save || !field) return
  switch (event.type) {
    case 'lines':
      playLines(event.speaker, event.portrait, event.lines)
      break
    case 'script':
      playScript(event.id)
      break
    case 'trigger':
      save.flags[`seen:${event.id}`] = true
      playScript(event.script)
      break
    case 'battle':
      nudge(event.instanceId)
      battleInstance = event.instanceId
      battleFlag = event.victoryFlag ?? ''
      battleFromScript = false
      startFight(event.enemies, event.ambush, event.boss, false)
      break
    case 'warp':
      goTo(event.map, event.x, event.y, event.facing)
      break
    case 'deny':
      say('Gate', 'npc', event.text)
      break
    case 'chest':
      openChest(event.chest)
      break
    case 'shop':
      shopId = event.id
      shopIndex = 0
      overlay = 'shop'
      break
    case 'gate':
      gateIndex = 0
      overlay = 'gate'
      audio.sfx('gate')
      break
    case 'save':
      save.party = healParty(save.party)
      saveManual(save)
      saveAuto(save)
      manualExists = true
      audio.sfx('heal')
      say('Crystal', 'npc', 'The crystal keeps this second, and steadies your pulse.')
      break
    case 'bell':
      ring(event.id)
      break
    default:
      break
  }
}

function ring(id: string): void {
  if (!save || !field) return
  const puzzle = puzzles.find((entry) => entry.map === field?.mapId)
  audio.sfx('bell')
  if (!puzzle) return
  if (save.flags[puzzle.successFlag]) {
    say('Bell', 'npc', 'The clearing already remembers the day.')
    return
  }
  const soFar = save.puzzleProgress[puzzle.id] ?? []
  const next = [...soFar, id]
  const good = puzzle.sequence.slice(0, next.length).every((step, index) => step === next[index])
  if (!good) {
    save.puzzleProgress[puzzle.id] = []
    playScript(puzzle.failScript)
    return
  }
  if (next.length >= puzzle.sequence.length) {
    save.puzzleProgress[puzzle.id] = []
    playScript(puzzle.successScript)
    return
  }
  save.puzzleProgress[puzzle.id] = next
  const words = next.map((step) => step.replace('bell-', '')).join(', then ')
  const speaker = save.party.some((member) => member.id === 'mira') ? 'Mira' : 'Kael'
  const portrait: PortraitId = speaker === 'Mira' ? 'mira' : 'kael'
  say(speaker, portrait, `${capitalize(words)}. The order is holding.`)
}

function openChest(chest: Chest): void {
  if (!save) return
  if (save.chests.includes(chest.id)) return
  save.chests.push(chest.id)
  const bits: string[] = []
  if (chest.item) {
    give(chest.item, 1)
    bits.push(itemById[chest.item]?.name ?? chest.item)
  }
  if (chest.gold) {
    save.gold += chest.gold
    bits.push(`${chest.gold} marks`)
  }
  if (chest.flag) save.flags[chest.flag] = true
  audio.sfx('chest')
  say('Chest', 'npc', bits.length ? `Inside: ${bits.join(', ')}.` : 'The chest is empty, and pleased about it.')
}

function give(id: string, n: number): void {
  if (!save) return
  const item = itemById[id]
  if (!item) return
  if (item.kind === 'weapon' || item.kind === 'armor') {
    if (!save.gear.includes(id)) save.gear.push(id)
    return
  }
  save.inventory[id] = (save.inventory[id] ?? 0) + n
}

function say(speaker: string, portrait: PortraitId, text: string): void {
  dialogue = { speaker, portrait, text }
}

function playLines(speaker: string, portrait: PortraitId, lines: string[]): void {
  if (script || !lines.length) return
  script = {
    steps: lines.map((text) => ({ op: 'say', who: speaker, portrait, text })),
    index: 0,
  }
  advanceScript()
}

function playScript(id: string): void {
  if (!save || script) return
  if (id === 'intro' && save.flags.intro_done) return
  if (id === 'after_hound' && save.flags.future_open) return
  if (id === 'after_saint' && save.flags.past_open) return
  if (id === 'cathedral_door' && save.flags.fuses_set) return
  if (id === 'seed_plant' && save.flags.seed_planted) return
  if (id === 'seed_witness' && save.flags.seed_seen) return
  if (id === 'seed_reward' && save.flags.seed_claimed) return
  if (id === 'crown_arrive' && (save.flags.torin_spar || save.flags.triple_ready)) return
  if (id === 'final_intro' && save.flags.stillness_dead) return
  const steps = scripts[id]
  if (!steps) return
  script = { steps, index: 0 }
  advanceScript()
}

function advanceScript(): void {
  if (!script || !save) return
  while (script.index < script.steps.length) {
    const step = script.steps[script.index++]
    if (step.op === 'say') {
      say(step.who, step.portrait, step.text)
      return
    }
    if (step.op === 'flag') {
      save.flags[step.id] = step.value !== false
      continue
    }
    if (step.op === 'obj') {
      save.objective = step.text
      continue
    }
    if (step.op === 'join') {
      join(step.who)
      continue
    }
    if (step.op === 'battle') {
      battleFromScript = true
      battleInstance = ''
      battleFlag = step.victoryFlag ?? ''
      startFight(step.enemies, step.ambush ?? 'fair', !!step.boss, !!step.tutorial)
      return
    }
    if (step.op === 'warp') {
      goTo(step.map, step.x, step.y, step.facing ?? 'down')
      continue
    }
    if (step.op === 'give') {
      give(step.item, step.n)
      continue
    }
    if (step.op === 'gold') {
      save.gold += step.n
      continue
    }
    if (step.op === 'heal') {
      save.party = healParty(save.party)
      continue
    }
    if (step.op === 'unlock') {
      if (!save.unlockedTechs.includes(step.tech)) save.unlockedTechs.push(step.tech)
      continue
    }
    if (step.op === 'echo') {
      save.echoMax = Math.max(save.echoMax, step.n)
      continue
    }
    if (step.op === 'despawn') {
      if (!save.defeated.includes(step.id)) save.defeated.push(step.id)
      continue
    }
    if (step.op === 'requireItems') {
      const missing = step.items.some((id) => (save?.inventory[id] ?? 0) < 1)
      if (missing) {
        script = null
        say('Mira', step.portrait ?? 'mira', step.elseSay)
        return
      }
      for (const id of step.items) save.inventory[id] = Math.max(0, (save.inventory[id] ?? 1) - 1)
      continue
    }
    if (step.op === 'inn') {
      if (save.gold < step.cost) {
        script = null
        say('Innkeeper', 'merchant', step.elseSay)
        return
      }
      save.gold -= step.cost
      save.party = healParty(save.party)
      audio.sfx('heal')
      continue
    }
    if (step.op === 'endgame') {
      save.cleared = true
      clearedStamp = true
      saveManual(save)
      manualExists = true
      script = null
      dialogue = null
      battle = null
      mode = 'ending'
      playMusic('ending')
      return
    }
  }
  script = null
}

function join(id: CharacterId): void {
  if (!save || save.party.some((member) => member.id === id)) return
  const lead = save.party[0]
  const level = Math.max(characters[id].joinLevel, lead?.level ?? 1)
  const member = makeMember(id, level)
  save.party.push(member)
  for (const gearId of [characters[id].weapon, characters[id].armor]) {
    if (!save.gear.includes(gearId)) save.gear.push(gearId)
  }
  if (field && !field.followers.some((follower) => follower.id === id)) {
    field.followers.push({ id, x: field.x, y: field.y, facing: field.facing, moving: false })
  }
}

function startFight(enemyIds: string[], ambush: 'fair' | 'player' | 'enemy', boss: boolean, tutorial: boolean): void {
  if (!save) return
  battleSettled = false
  afterRewards = null
  animWasOn = false
  const opts = {
    mode: save.settings.atb,
    speed: save.settings.speed,
    echoMax: save.echoMax,
    ambush,
    tutorial,
    bestiary: save.bestiary,
    unlocked: [
      ...save.unlockedTechs,
      ...Object.entries(save.flags)
        .filter(([, on]) => on)
        .map(([key]) => key),
    ],
    inventory: { ...save.inventory },
  } as BattleCreateOpts
  battle = createBattle(save.party, enemyIds, opts)
  if (field) field.encounterLock = 2.5
  playMusic(boss || enemyIds.some((id) => enemyById[id]?.boss) ? 'boss' : 'battle')
}

function settleBattle(): void {
  if (!battle || !save || battleSettled) return
  battleSettled = true
  if (battle.result === 'lose') {
    mode = 'gameover'
    playMusic('dial')
    return
  }
  absorbFindings()
  writeVitals()
  for (const id of battle.consumed) {
    save.inventory[id] = Math.max(0, (save.inventory[id] ?? 0) - 1)
  }
  if (battle.result === 'flee') {
    if (field) field.encounterLock = 2.5
    const fromScript = battleFromScript
    battle = null
    battleFromScript = false
    playMusic(field ? maps[field.mapId].music : 'town')
    if (fromScript) advanceScript()
    return
  }
  if (battleInstance && !save.defeated.includes(battleInstance)) save.defeated.push(battleInstance)
  if (battleFlag) save.flags[battleFlag] = true
  const gained = grantXp(save.party, battle.rewards.xp)
  save.party = gained.party
  save.gold += battle.rewards.gold
  for (const item of battle.rewards.items) give(item, 1)
  const lines = ['The clock moves on.']
  if (battle.rewards.xp) lines.push(`+${battle.rewards.xp} experience`)
  if (battle.rewards.gold) lines.push(`+${battle.rewards.gold} marks`)
  for (const item of battle.rewards.items) lines.push(itemById[item]?.name ?? item)
  for (const level of gained.levels) lines.push(`${level.name} reaches level ${level.to}`)
  if (gained.levels.length) audio.sfx('level')
  battle.rewards.levels = gained.levels
  afterRewards = FOLLOWUP[battleFlag] ?? null
  menuIndex = 0
  overlay = 'rewards'
  rewardLines = lines
  playMusic('victory')
  musicBack = 2.4
}

let rewardLines: string[] = []

function closeRewards(): void {
  const next = afterRewards
  const fromScript = battleFromScript
  afterRewards = null
  battleFromScript = false
  battle = null
  overlay = 'none'
  if (field) field.encounterLock = 2.5
  if (next) playScript(next)
  else if (fromScript) advanceScript()
  else if (field) playMusic(maps[field.mapId].music)
}

function writeVitals(): void {
  if (!save || !battle) return
  for (const ally of battle.allies) {
    const member = save.party.find((entry) => entry.id === ally.characterId)
    if (!member) continue
    member.hp = Math.max(0, ally.hp)
    member.mp = Math.max(0, Math.min(maxMp(member), ally.mp))
  }
}

function absorbFindings(): void {
  if (!save || !battle) return
  for (const found of battle.discovered) {
    const known = save.bestiary[found.enemyId] ?? []
    if (!known.includes(found.element)) known.push(found.element)
    save.bestiary[found.enemyId] = known
  }
}

function nudge(instanceId: string): void {
  if (!field || !save) return
  const pos = field.enemies[instanceId]
  if (!pos) return
  const dx = field.x - pos.x
  const dy = field.y - pos.y
  const mag = Math.hypot(dx, dy) || 1
  field.x += (dx / mag) * 18
  field.y += (dy / mag) * 18
  save.x = field.x
  save.y = field.y
  saveAuto(save)
}

function goTo(map: MapId, tileX: number, tileY: number, facing: Dir): void {
  if (!save) return
  save.map = map
  save.x = (tileX + 0.5) * TILE
  save.y = (tileY + 0.5) * TILE
  save.facing = facing
  field = createField(save)
  saveAuto(save)
  announcePlace()
  if (!battle) playMusic(maps[map].music)
}

function announcePlace(): void {
  if (!field) return
  const map = maps[field.mapId]
  announce = { kicker: eraName(map.era), title: map.name }
  announceT = 2.3
}

function toast(title: string): void {
  announce = { title }
  announceT = 1.3
}

function buy(id: string): void {
  if (!save) return
  const item = itemById[id]
  if (!item) return
  if (save.gold < item.price) {
    toast('Not enough marks')
    audio.sfx('cancel')
    return
  }
  if ((item.kind === 'weapon' || item.kind === 'armor') && save.gear.includes(id)) {
    toast('Already in the bag')
    return
  }
  save.gold -= item.price
  give(id, 1)
  audio.sfx('confirm')
  toast(item.name)
}

function travel(id: string): void {
  if (!save) return
  const gate = gates.find((entry) => entry.id === id)
  if (!gate) return
  if (gate.requires && !save.flags[gate.requires]) {
    closePanels()
    say('Gate', 'npc', gate.deny ?? 'The gate is shut.')
    return
  }
  closePanels()
  audio.sfx('gate')
  goTo(gate.map, gate.x, gate.y, gate.facing)
}

function applyItem(member: MemberState, item: ItemDef): boolean {
  if (item.revive) {
    if (member.hp > 0) return false
    member.hp = item.hp ?? Math.max(1, Math.round(maxHp(member) * 0.3))
    return true
  }
  if (member.hp <= 0) return false
  if (item.full) {
    member.hp = maxHp(member)
    member.mp = maxMp(member)
    return true
  }
  let used = false
  if (item.hp) {
    const next = Math.min(maxHp(member), member.hp + item.hp)
    if (next !== member.hp) {
      member.hp = next
      used = true
    }
  }
  if (item.mp) {
    const next = Math.min(maxMp(member), member.mp + item.mp)
    if (next !== member.mp) {
      member.mp = next
      used = true
    }
  }
  return used
}

function applySetting(key: string, value: string | number | boolean): void {
  const settings = mode === 'title' || !save ? titleSettings : save.settings
  if (key === 'atb' && (value === 'wait' || value === 'active')) settings.atb = value
  if (key === 'speed' && typeof value === 'number') settings.speed = value
  if (key === 'volume' && typeof value === 'number') {
    settings.volume = value
    audio.setVolume(value)
  }
  if (key === 'shake' && typeof value === 'boolean') settings.shake = value
  if (key === 'text' && (value === 'slow' || value === 'mid' || value === 'fast')) settings.text = value
  if (save && battle) {
    battle.mode = save.settings.atb
    battle.speed = save.settings.speed
  }
}

function noteBattleSound(): void {
  if (!battle) return
  const on = !!battle.anim
  if (on && !animWasOn && battle.anim) {
    const element = battle.anim.element
    const cue =
      element === 'fire'
        ? 'fire'
        : element === 'ice'
          ? 'ice'
          : element === 'volt'
            ? 'volt'
            : element === 'heal'
              ? 'heal'
              : element === 'time'
                ? 'rewind'
                : 'hit'
    audio.sfx(cue)
  }
  animWasOn = on
}

function playMusic(id: MusicId): void {
  if (lastMusic === id) return
  lastMusic = id
  audio.playMusic(id)
}

function paint(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false
  if (mode === 'title') {
    drawTitle(ctx, clock)
    return
  }
  if (mode === 'ending') {
    drawEnding(ctx, clock, Math.floor(clock / 6) % 3)
    return
  }
  if (battle && (mode === 'play' || mode === 'gameover')) {
    drawBattle(ctx, {
      era: field ? maps[field.mapId].era : 'present',
      time: clock,
      allies: battle.allies.map((ally, slot) => toDraw(ally, slot)),
      enemies: battle.enemies.map((enemy, slot) => toDraw(enemy, slot)),
      effect: battle.anim
        ? { element: battle.anim.element, t: battle.anim.dur ? battle.anim.t / battle.anim.dur : 0, name: battle.anim.name }
        : null,
      shake: save?.settings.shake && battle.anim && battle.anim.t < 0.12 ? (battle.enemies.some((e) => e.boss) ? 5 : 3) : 0,
    })
    return
  }
  if (field) {
    const map = maps[field.mapId]
    drawWorld(ctx, { map, camera: fieldCamera(field), time: clock, actors: actors(), causality: save?.flags })
  }
}

function toDraw(actor: BattleState['allies'][number], slot: number): BattleDrawActor {
  let pose: BattleDrawActor['pose'] = actor.alive ? 'idle' : 'down'
  let flash = 0
  if (battle?.anim && actor.alive) {
    const anim = battle.anim
    if (anim.actorUid === actor.uid) pose = anim.element === 'heal' || anim.element === 'time' ? 'cast' : 'act'
    if (anim.targetUids.includes(actor.uid) && anim.applied && anim.t < anim.hitAt + 0.18) {
      pose = 'hurt'
      flash = 1
    }
  }
  return {
    sprite: actor.sprite,
    pose,
    slot,
    charging: !!actor.charging,
    boss: actor.boss,
    flash,
    hpRatio: actor.maxHp ? actor.hp / actor.maxHp : 0,
  }
}

function actors(): ActorDraw[] {
  if (!field || !save) return []
  const map = maps[field.mapId]
  const list: ActorDraw[] = []
  const leader = characters.kael.sprite
  list.push({ sprite: leader, x: field.x, y: field.y, dir: field.facing, moving: field.moving })
  for (const follower of field.followers) {
    const who = characters[follower.id]
    list.push({ sprite: who.sprite, x: follower.x, y: follower.y, dir: follower.facing, moving: follower.moving })
  }
  for (const npc of map.npcs) {
    if (npc.requires && !save.flags[npc.requires]) continue
    if (npc.unless && save.flags[npc.unless]) continue
    list.push({ sprite: npc.sprite, x: (npc.x + 0.5) * TILE, y: (npc.y + 0.5) * TILE, dir: 'down', moving: false })
  }
  for (const enemy of map.enemies) {
    if (save.defeated.includes(enemy.instanceId)) continue
    if (enemy.requires && !save.flags[enemy.requires]) continue
    if (enemy.unless && save.flags[enemy.unless]) continue
    const pos = field.enemies[enemy.instanceId]
    const sprite = enemyById[enemy.enemies[0] ?? '']?.sprite
    if (!pos || !sprite) continue
    list.push({ sprite, x: pos.x, y: pos.y, dir: pos.facing, moving: enemy.chase })
  }
  for (const chest of map.chests) {
    const open = save.chests.includes(chest.id)
    list.push({
      sprite: open ? 'chest-open' : 'chest',
      x: (chest.x + 0.5) * TILE,
      y: (chest.y + 0.5) * TILE,
      dir: 'down',
      moving: false,
    })
  }
  for (const interact of map.interacts) {
    if (interact.kind !== 'bell') continue
    list.push({
      sprite: 'bell',
      x: (interact.x + 0.5) * TILE,
      y: (interact.y + 0.5) * TILE,
      dir: 'down',
      moving: false,
    })
  }
  return list
}

function chips(): UiModel['party'] {
  if (!save) return []
  return save.party.map((member) => {
    const ally = battle?.allies.find((entry) => entry.characterId === member.id)
    const hp = ally ? ally.hp : member.hp
    const mp = ally ? ally.mp : member.mp
    return {
      id: member.id,
      name: characters[member.id].name,
      level: member.level,
      hp,
      maxHp: maxHp(member),
      mp,
      maxMp: maxMp(member),
      atb: ally?.atb ?? 0,
      color: characters[member.id].color,
      down: hp <= 0,
    }
  })
}

function currentMenu(): MenuModel {
  if (overlay === 'rewards') {
    return { title: 'Victory', index: 0, rows: [{ id: 'reward-ok', label: 'Continue' }], aside: rewardLines.join('\n') }
  }
  if (!save) return { title: '', index: 0, rows: [] }
  const rows = menuRows()
  if (menuIndex >= rows.length) menuIndex = 0
  const aside = rows[menuIndex]?.detail
  return { title: menuTitle(), index: menuIndex, rows, aside }
}

function menuTitle(): string {
  switch (screen.id) {
    case 'party':
      return 'Party'
    case 'items':
      return 'Bag'
    case 'pick':
      return itemById[screen.item]?.name ?? 'Use'
    case 'equip':
      return 'Equip'
    case 'equip-slot':
      return characters[screen.who].name
    case 'equip-pick':
      return screen.slot === 'weapon' ? 'Weapon' : 'Armor'
    case 'techs':
      return 'Techs'
    case 'lore':
      return 'Bestiary'
    case 'chronicle':
      return 'Chronicle'
    default:
      return 'Pause'
  }
}

function menuRows(): MenuModel['rows'] {
  if (!save) return []
  if (screen.id === 'root') {
    return [
      { id: 'nav-party', label: 'Party', detail: save.objective },
      { id: 'nav-items', label: 'Bag' },
      { id: 'nav-equip', label: 'Equip' },
      { id: 'nav-techs', label: 'Techs' },
      { id: 'nav-lore', label: 'Bestiary' },
      { id: 'nav-chronicle', label: 'Chronicle' },
      { id: 'do-save', label: 'Save' },
      { id: 'nav-settings', label: 'Settings' },
      { id: 'menu-close', label: 'Close' },
    ]
  }
  if (screen.id === 'party') {
    return [
      ...save.party.map((member) => {
        const stats = combatNumbers(member)
        const weapon = itemById[member.weapon]?.name ?? 'Empty hands'
        const armor = itemById[member.armor]?.name ?? 'No coat'
        return {
          id: `look:${member.id}`,
          label: `${characters[member.id].name}  Lv ${member.level}`,
          detail: `HP ${member.hp}/${stats.maxHp}   MP ${member.mp}/${stats.maxMp}\nATK ${stats.atk}  DEF ${stats.def}  MAG ${stats.mag}  SPD ${stats.spd}\n${weapon} · ${armor}`,
        }
      }),
      { id: 'back', label: 'Back' },
    ]
  }
  if (screen.id === 'chronicle') return chronicleRows(save)
  if (screen.id === 'items') {
    const rows = Object.entries(save.inventory)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const item = itemById[id]
        const usable = item?.kind === 'consumable'
        return {
          id: `use:${id}`,
          label: `${item?.name ?? id} ×${count}`,
          detail: item?.blurb,
          disabled: !usable,
        }
      })
    if (!rows.length) rows.push({ id: 'back', label: 'The bag is empty', detail: '', disabled: true })
    rows.push({ id: 'back', label: 'Back', detail: '', disabled: false })
    return rows
  }
  if (screen.id === 'pick') {
    const item = itemById[screen.item]
    return [
      ...save.party.map((member) => ({
        id: `target:${member.id}`,
        label: characters[member.id].name,
        detail: item?.blurb,
        disabled: item?.revive ? member.hp > 0 : member.hp <= 0,
      })),
      { id: 'back', label: 'Back' },
    ]
  }
  if (screen.id === 'equip') {
    return [
      ...save.party.map((member) => ({
        id: `who:${member.id}`,
        label: characters[member.id].name,
        detail: `${itemById[member.weapon]?.name ?? '—'} · ${itemById[member.armor]?.name ?? '—'}`,
      })),
      { id: 'back', label: 'Back' },
    ]
  }
  if (screen.id === 'equip-slot') {
    const who = screen.who
    const member = save.party.find((entry) => entry.id === who)
    return [
      { id: 'slot:weapon', label: 'Weapon', detail: itemById[member?.weapon ?? '']?.name },
      { id: 'slot:armor', label: 'Armor', detail: itemById[member?.armor ?? '']?.name },
      { id: 'back', label: 'Back' },
    ]
  }
  if (screen.id === 'equip-pick') {
    const rows = save.gear
      .filter((id) => {
        const item = itemById[id]
        if (!item) return false
        if (screen.id !== 'equip-pick') return false
        if (item.kind !== screen.slot) return false
        if (item.users && !item.users.includes(screen.who)) return false
        return true
      })
      .map((id) => ({
        id: `gear:${id}`,
        label: itemById[id]?.name ?? id,
        detail: itemById[id]?.blurb,
      }))
    rows.push({ id: 'back', label: 'Back', detail: '' })
    return rows
  }
  if (screen.id === 'techs') {
    const flags = save.flags
    const known = new Set([...save.unlockedTechs, ...Object.keys(flags).filter((key) => flags[key])])
    return techRows(known)
  }
  const book = save.bestiary
  const seen = Object.keys(book)
  const rows = seen.map((id) => {
    const enemy = enemyById[id]
    const elements = (book[id] ?? []).map(elementName).join(', ')
    return {
      id: `lore:${id}`,
      label: enemy?.name ?? id,
      detail: elements ? `Known weakness: ${elements}` : 'No weakness confirmed yet.',
    }
  })
  if (!rows.length) rows.push({ id: 'back', label: 'Nothing studied yet', detail: 'Mira can Read a foe in battle.' })
  rows.push({ id: 'back', label: 'Back', detail: '' })
  return rows
}

function techRows(known: Set<string>): MenuModel['rows'] {
  if (!save) return []
  const present = new Set(save.party.map((member) => member.id))
  const list: MenuModel['rows'] = []
  // Imported lazily through characters' tech ids plus combo scan is done in battle.
  // The content module's tech list is reached via character defs and a direct import would cycle.
  for (const member of save.party) {
    for (const techId of characters[member.id].techs) {
      const locked = techNeeds(techId, known)
      list.push({
        id: `tech-look:${techId}`,
        label: `${characters[member.id].name} · ${prettyTech(techId)}`,
        detail: locked ? 'Not learned yet.' : techBlurb(techId),
        disabled: locked,
      })
    }
  }
  for (const techId of ['rift-waltz', 'twin-oath', 'bellfrost', 'clockfall']) {
    const users = comboUsers(techId)
    if (!users.every((id) => present.has(id))) continue
    const locked = techId === 'clockfall' && !known.has('triple_ready') && !known.has('clockfall')
    list.push({
      id: `tech-look:${techId}`,
      label: prettyTech(techId),
      detail: locked ? 'It needs all three ages.' : 'Combo. Everyone named must have a full bar.',
      disabled: locked,
    })
  }
  list.push({ id: 'back', label: 'Back' })
  return list
}

function techNeeds(techId: string, known: Set<string>): boolean {
  if (techId === 'sever') return !known.has('sever') && !known.has('sever_unlocked')
  if (techId === 'bolt') return !known.has('bolt') && !known.has('bolt_unlocked')
  return false
}

function comboUsers(techId: string): CharacterId[] {
  if (techId === 'rift-waltz') return ['kael', 'mira']
  if (techId === 'twin-oath') return ['kael', 'torin']
  if (techId === 'bellfrost') return ['mira', 'torin']
  return ['kael', 'mira', 'torin']
}

function prettyTech(id: string): string {
  return id
    .split('-')
    .map((part) => capitalize(part))
    .join(' ')
}

function techBlurb(id: string): string {
  const blurbs: Record<string, string> = {
    cyclone: 'A turning cut.',
    'arc-slash': 'The arc hits every foe in reach.',
    sever: 'Breaks a charging strike.',
    kindle: 'A mouthful of fire.',
    needle: 'Ice, thin and exact.',
    mend: 'Closes a wound.',
    read: 'Names a weakness.',
    bolt: 'The Volt Bell, borrowed.',
    hammerfall: 'Heavy, and finished.',
    bulwark: 'The party takes the next hit smaller.',
    quake: 'The floor takes a side.',
    rally: 'A breath for everyone still standing.',
  }
  return blurbs[id] ?? ''
}

function currentShop(): ShopModel {
  const shop = shops.find((entry) => entry.id === shopId)
  const rows =
    shop?.items.map((id) => {
      const item = itemById[id]
      const owned = !!item && (item.kind === 'weapon' || item.kind === 'armor') && !!save?.gear.includes(id)
      const poor = (save?.gold ?? 0) < (item?.price ?? 0)
      return {
        id: `buy:${id}`,
        label: item?.name ?? id,
        detail: item?.blurb ?? '',
        price: item?.price ?? 0,
        disabled: owned || poor,
      }
    }) ?? []
  if (shopIndex >= rows.length) shopIndex = 0
  return {
    title: shop?.name ?? 'Shop',
    index: shopIndex,
    gold: save?.gold ?? 0,
    rows,
    aside: rows[shopIndex]?.detail,
  }
}

function currentGate(): MenuModel {
  const rows = gates.map((gate) => {
    const open = !gate.requires || !!save?.flags[gate.requires]
    return {
      id: `gate:${gate.id}`,
      label: gate.label,
      detail: open ? gate.detail : (gate.deny ?? 'Shut.'),
      disabled: !open,
    }
  })
  if (gateIndex >= rows.length) gateIndex = 0
  return { title: 'Gate', index: gateIndex, rows, aside: rows[gateIndex]?.detail }
}

function view(): UiModel {
  const settings = aliveSettings()
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  const map = field ? maps[field.mapId] : null
  let battleUi: UiModel['battle'] = null
  if (battle && overlay === 'none' && mode !== 'gameover') {
    const actorUid = battle.actorUid
    const commands = currentCommands(battle)
    const targets = currentTargets(battle)
    battleUi = {
      phase: battle.phase === 'victory' ? 'victory' : battle.phase === 'defeat' ? 'defeat' : battle.phase === 'flee' ? 'flee' : 'fight',
      commands,
      commandIndex: Math.min(battle.menuIndex, Math.max(0, commands.length - 1)),
      targets,
      targetIndex: battle.targetIndex,
      pickingTarget: battle.phase === 'target',
      log: battle.log.slice(-3),
      echoes: battle.echoes,
      echoMax: battle.echoMax,
      actorName: battle.allies.find((ally) => ally.uid === actorUid)?.name ?? null,
      canRewind: battle.echoes > 0 && battle.history.length > 0,
      banner: battle.bannerT > 0 ? battle.banner : '',
      tutorial:
        battle.tutorial && (battle.phase === 'command' || battle.phase === 'intro')
          ? battle.echoMax > 0
            ? 'Bars fill with time. When yours is full, choose a strike. Wait mode holds the bars while you think. R rewinds one action.'
            : 'Bars fill with time. When yours is full, choose a strike. Wait mode holds the bars while you think.'
          : '',
      modeLabel: battle.mode === 'wait' ? 'Wait' : 'Active',
      speed: battle.speed,
      rewards: null,
      floaters: battle.floaters.map((floater) => ({
        id: floater.id,
        text: floater.text,
        x: floater.x,
        y: floater.y,
        kind: floater.kind,
      })),
      party: chips(),
      enemies: battle.enemies.map((enemy) => ({
        uid: enemy.uid,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        charging: enemy.charging ? enemy.charging.name : '',
        chargeProgress: enemy.charging ? Math.min(1, enemy.charging.t / Math.max(0.001, enemy.charging.dur)) : 0,
        ultimate: enemy.charging?.ultimate === true,
        boss: enemy.boss,
      })),
    }
  }
  const hint = battle
    ? 'Arrows choose  ·  Z confirms  ·  X back  ·  R rewinds'
    : 'Arrows move  ·  Z talks  ·  X back  ·  Esc menu  ·  Shift runs'
  return {
    mode,
    overlay,
    announce,
    dialogue,
    objective: save?.objective ?? '',
    place: map?.name ?? '',
    era: map?.era ?? 'present',
    gold: save?.gold ?? 0,
    clockOn: clearedStamp || !!save?.cleared,
    playSeconds: save?.playtime ?? 0,
    party: chips(),
    hint,
    hasSave: manualExists,
    cleared: clearedStamp,
    settings,
    menu: overlay === 'menu' || overlay === 'rewards' ? currentMenu() : null,
    shop: overlay === 'shop' ? currentShop() : null,
    gate: overlay === 'gate' ? currentGate() : null,
    battle: battleUi,
    endingLines: ENDING,
    gameoverText: 'The Echo Lens snaps the second shut. You are pulled back to the last crystal that knew your name.',
    showTouch: touch,
  }
}

function eraName(era: Era): string {
  if (era === 'future') return 'The ash age'
  if (era === 'past') return 'The crown age'
  if (era === 'void') return 'Beneath the dial'
  return 'The fair age'
}

function elementName(element: Element): string {
  if (element === 'phys') return 'Physical'
  if (element === 'fire') return 'Fire'
  if (element === 'ice') return 'Ice'
  if (element === 'volt') return 'Volt'
  if (element === 'shadow') return 'Shadow'
  if (element === 'time') return 'Time'
  return 'Heal'
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}
