/** Shared contracts for Clockfall. Implementation files import from here. */

export type Era = 'present' | 'future' | 'past' | 'void'
export type Dir = 'down' | 'up' | 'left' | 'right'
export type Element = 'phys' | 'fire' | 'ice' | 'volt' | 'shadow' | 'time' | 'heal'
export type CharacterId = 'kael' | 'mira' | 'torin'
export type MapId = 'leorain' | 'woods' | 'ashspire' | 'cathedral' | 'crownkeep' | 'dial'
export type MusicId =
  | 'title'
  | 'town'
  | 'woods'
  | 'future'
  | 'past'
  | 'dial'
  | 'battle'
  | 'boss'
  | 'victory'
  | 'ending'
export type SfxId =
  | 'cursor'
  | 'confirm'
  | 'cancel'
  | 'hit'
  | 'hurt'
  | 'heal'
  | 'fire'
  | 'ice'
  | 'volt'
  | 'tech'
  | 'chest'
  | 'gate'
  | 'rewind'
  | 'level'
  | 'die'
  | 'bell'
  | 'guard'
  | 'click'
export type StatusId = 'poison' | 'slow' | 'haste' | 'protect' | 'blind' | 'stagger'
export type SpriteId =
  | 'kael'
  | 'mira'
  | 'torin'
  | 'mayor'
  | 'merchant'
  | 'kid'
  | 'guard'
  | 'smith'
  | 'survivor'
  | 'priest'
  | 'noble'
  | 'gnatcoil'
  | 'briarhusk'
  | 'clockmite'
  | 'hound'
  | 'cindermote'
  | 'acolyte'
  | 'wisp'
  | 'saint'
  | 'wraith'
  | 'oath'
  | 'shade'
  | 'minute'
  | 'hour'
  | 'stillness'
  | 'chest'
  | 'chest-open'
  | 'bell'
export type PortraitId =
  | 'kael'
  | 'mira'
  | 'torin'
  | 'mayor'
  | 'merchant'
  | 'survivor'
  | 'priest'
  | 'noble'
  | 'hound'
  | 'saint'
  | 'stillness'
  | 'npc'

export interface Stats {
  hp: number
  mp: number
  atk: number
  def: number
  mag: number
  spd: number
}

export interface CharacterDef {
  id: CharacterId
  name: string
  title: string
  joinLevel: number
  base: Stats
  growth: Stats
  techs: string[]
  weapon: string
  armor: string
  sprite: SpriteId
  portrait: PortraitId
  color: string
  blurb: string
}

export interface TechDef {
  id: string
  name: string
  blurb: string
  element: Element
  /** 0 for non-damaging utilities. Heal amount uses the heal formula. */
  power: number
  mp: number
  target: 'enemy' | 'all-enemies' | 'ally' | 'all-allies' | 'self'
  /** Solo techs list one user. Dual and triple techs list every participant. */
  users: CharacterId[]
  /** Cancels an enemy charge and staggers them. */
  interrupt?: boolean
  status?: { id: StatusId; chance: number; turns: number }
  /** Flag that must already be true before the tech appears. */
  unlockFlag?: string
  heal?: boolean
  revive?: boolean
}

export interface ItemDef {
  id: string
  name: string
  blurb: string
  kind: 'consumable' | 'weapon' | 'armor' | 'key'
  price: number
  hp?: number
  mp?: number
  revive?: boolean
  full?: boolean
  atk?: number
  def?: number
  mag?: number
  spd?: number
  users?: CharacterId[]
}

export interface EnemySkill {
  id: string
  name: string
  element: Element
  power: number
  /** Seconds of visible windup. 0 means the action fires immediately. */
  charge: number
  target: 'enemy' | 'all-enemies' | 'ally' | 'all-allies' | 'self'
  weight: number
  status?: { id: StatusId; chance: number; turns: number }
  heal?: boolean
  /** Signature wipe. Long telegraph. Guard, interrupt, or a triple tech blunts it. */
  ultimate?: boolean
}

export interface EnemyDef {
  id: string
  name: string
  sprite: SpriteId
  hp: number
  mp: number
  atk: number
  def: number
  mag: number
  spd: number
  xp: number
  gold: number
  weaknesses: Element[]
  resists: Element[]
  skills: EnemySkill[]
  boss?: boolean
  drops?: { item: string; chance: number }[]
}

export interface GameMap {
  id: MapId
  name: string
  era: Era
  music: MusicId
  /** Tile rows, origin top-left, y increases south. Rectangular. */
  rows: string[]
  npcs: Npc[]
  enemies: FieldEnemy[]
  chests: Chest[]
  warps: Warp[]
  triggers: Trigger[]
  interacts: Interact[]
}

export interface Npc {
  id: string
  name: string
  portrait: PortraitId
  sprite: SpriteId
  x: number
  y: number
  lines: string[]
  script?: string
  requires?: string
  unless?: string
}

export interface FieldEnemy {
  instanceId: string
  /** One id, or a group for mixed fights. */
  enemies: string[]
  x: number
  y: number
  patrol: { x: number; y: number }[]
  chase: boolean
  boss: boolean
  victoryFlag?: string
  requires?: string
  unless?: string
}

export interface Chest {
  id: string
  x: number
  y: number
  item?: string
  gold?: number
  flag?: string
}

export interface Warp {
  id: string
  x: number
  y: number
  w: number
  h: number
  to: MapId
  tx: number
  ty: number
  facing: Dir
  requires?: string
  deny?: string
}

export interface Trigger {
  id: string
  x: number
  y: number
  w: number
  h: number
  script: string
  once?: boolean
  requires?: string
  unless?: string
}

export interface Interact {
  id: string
  x: number
  y: number
  kind: 'sign' | 'save' | 'shop' | 'gate' | 'bell' | 'script' | 'chest'
  script?: string
  shop?: string
  text?: string
  /** Chest id when kind is chest. */
  chest?: string
}

export interface ShopDef {
  id: string
  name: string
  items: string[]
}

export interface GateDest {
  id: string
  label: string
  detail: string
  map: MapId
  x: number
  y: number
  facing: Dir
  requires?: string
  deny?: string
}

export interface PuzzleDef {
  id: string
  map: MapId
  /** Interact ids in the correct order. */
  sequence: string[]
  successFlag: string
  successScript: string
  failScript: string
}

export type ScriptStep =
  | { op: 'say'; who: string; portrait: PortraitId; text: string }
  | { op: 'flag'; id: string; value?: boolean }
  | { op: 'obj'; text: string }
  | { op: 'join'; who: CharacterId }
  | {
      op: 'battle'
      enemies: string[]
      boss?: boolean
      ambush?: 'fair' | 'player' | 'enemy'
      victoryFlag?: string
      tutorial?: boolean
    }
  | { op: 'warp'; map: MapId; x: number; y: number; facing?: Dir }
  | { op: 'give'; item: string; n: number }
  | { op: 'gold'; n: number }
  | { op: 'heal' }
  | { op: 'unlock'; tech: string }
  | { op: 'echo'; n: number }
  | { op: 'despawn'; id: string }
  | { op: 'requireItems'; items: string[]; elseSay: string; portrait?: PortraitId }
  | { op: 'inn'; cost: number; elseSay: string }
  | { op: 'endgame' }

export interface MemberState {
  id: CharacterId
  level: number
  xp: number
  hp: number
  mp: number
  weapon: string
  armor: string
}

export interface Settings {
  atb: 'wait' | 'active'
  /** 1, 1.5, 2, or 3 */
  speed: number
  volume: number
  shake: boolean
  text: 'slow' | 'mid' | 'fast'
}

export interface SaveData {
  version: 1
  party: MemberState[]
  /** Consumables and key items. */
  inventory: Record<string, number>
  /** Owned unique gear ids. */
  gear: string[]
  gold: number
  flags: Record<string, boolean>
  /** Tech ids removed from the locked list. unlockFlag still applies if set. */
  unlockedTechs: string[]
  chests: string[]
  defeated: string[]
  puzzleProgress: Record<string, string[]>
  map: MapId
  x: number
  y: number
  facing: Dir
  objective: string
  /** Enemy id -> elements the player has confirmed. */
  bestiary: Record<string, Element[]>
  echoMax: number
  settings: Settings
  playtime: number
  cleared: boolean
}

export interface StatusInst {
  id: StatusId
  turns: number
}

export interface Combatant {
  uid: string
  kind: 'party' | 'enemy'
  defId: string
  name: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atk: number
  def: number
  mag: number
  spd: number
  atb: number
  statuses: StatusInst[]
  defending: boolean
  charging: null | { skillId: string; name: string; t: number; dur: number; ultimate?: boolean }
  alive: boolean
  sprite: SpriteId
  weaknesses: Element[]
  resists: Element[]
  xp: number
  gold: number
  drops: { item: string; chance: number }[]
  boss: boolean
  characterId?: CharacterId
  level?: number
  acted: boolean
}

export interface DamageEvent {
  uid: string
  amount: number
  weak: boolean
  heal: boolean
  miss: boolean
  text: string
}

export interface BattleAnim {
  name: string
  element: Element
  actorUid: string
  targetUids: string[]
  t: number
  dur: number
  hitAt: number
  applied: boolean
  damages: DamageEvent[]
  banner: string
}

export type BattlePhase = 'intro' | 'run' | 'command' | 'target' | 'combo-wait' | 'resolve' | 'victory' | 'defeat' | 'flee'

export interface LevelGain {
  id: CharacterId
  name: string
  from: number
  to: number
}

export interface BattleRewards {
  xp: number
  gold: number
  items: string[]
  levels: LevelGain[]
}

export interface BattleState {
  phase: BattlePhase
  allies: Combatant[]
  enemies: Combatant[]
  mode: 'wait' | 'active'
  speed: number
  actorUid: string | null
  menu: 'root' | 'tech' | 'combo' | 'item'
  menuIndex: number
  targetSide: 'enemy' | 'ally'
  targetIndex: number
  pendingTech: string | null
  echoes: number
  echoMax: number
  log: string[]
  banner: string
  bannerT: number
  anim: BattleAnim | null
  rewards: BattleRewards
  result: 'ongoing' | 'win' | 'lose' | 'flee'
  tutorial: boolean
  lockedElement: Element | null
  hourSpawned: boolean
  floaters: { id: string; text: string; x: number; y: number; kind: 'dmg' | 'heal' | 'weak'; life: number }[]
  /** Deep clones taken at the start of each resolved action. Echo pops one. */
  history: BattleSnapshot[]
  /** Weaknesses confirmed during this fight. The game copies them into the save. */
  discovered: { enemyId: string; element: Element }[]
  /** Consumable ids used this fight, in order. The game removes them from the bag. */
  consumed: string[]
  rng: number
}

export interface BattleCreateOpts {
  mode: 'wait' | 'active'
  speed: number
  echoMax: number
  ambush: 'fair' | 'player' | 'enemy'
  tutorial?: boolean
  bestiary: Record<string, Element[]>
}

export interface FieldState {
  mapId: MapId
  x: number
  y: number
  facing: Dir
  moving: boolean
  followers: { id: CharacterId; x: number; y: number; facing: Dir; moving: boolean }[]
  enemies: Record<string, { x: number; y: number; facing: Dir }>
  /** Seconds left before a new contact fight can start. */
  encounterLock: number
  /** Warp id currently occupied, so stepping on it fires once. */
  warpLatch: string | null
  /** Trigger id currently occupied. */
  triggerLatch: string | null
}

export interface BattleSnapshot {
  allies: Combatant[]
  enemies: Combatant[]
  lockedElement: Element | null
  hourSpawned: boolean
  log: string[]
  rng: number
  discovered: { enemyId: string; element: Element }[]
  consumed: string[]
  inventory: Record<string, number>
  rewards: BattleRewards
}

export type FieldEvent =
  | { type: 'lines'; speaker: string; portrait: PortraitId; lines: string[] }
  | { type: 'script'; id: string }
  | { type: 'battle'; instanceId: string; enemies: string[]; ambush: 'fair' | 'player' | 'enemy'; boss: boolean; victoryFlag?: string }
  | { type: 'warp'; map: MapId; x: number; y: number; facing: Dir }
  | { type: 'deny'; text: string }
  | { type: 'chest'; chest: Chest }
  | { type: 'shop'; id: string }
  | { type: 'gate' }
  | { type: 'save' }
  | { type: 'bell'; id: string }
  | { type: 'trigger'; id: string; script: string }

export interface InputFrame {
  x: number
  y: number
  run: boolean
  confirm: boolean
  cancel: boolean
  menu: boolean
  rewind: boolean
}

export interface ActorDraw {
  sprite: SpriteId
  x: number
  y: number
  dir: Dir
  moving: boolean
  flash?: boolean
}

export interface BattleDrawActor {
  sprite: SpriteId
  pose: 'idle' | 'act' | 'hurt' | 'down' | 'cast'
  slot: number
  charging: boolean
  boss: boolean
  flash: number
  hpRatio: number
}

export interface PartyChip {
  id: CharacterId
  name: string
  level: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atb: number
  color: string
  down: boolean
}

export interface MenuModel {
  title: string
  index: number
  rows: { id: string; label: string; detail?: string; disabled?: boolean }[]
  aside?: string
}

export interface ShopModel {
  title: string
  index: number
  gold: number
  rows: { id: string; label: string; detail: string; price: number; disabled?: boolean }[]
  aside?: string
}

export interface BattleUi {
  phase: 'fight' | 'victory' | 'defeat' | 'flee'
  actorName: string | null
  canRewind: boolean
  commands: { id: string; label: string; detail?: string; disabled?: boolean }[]
  commandIndex: number
  targets: { id: string; label: string }[]
  targetIndex: number
  pickingTarget: boolean
  log: string[]
  echoes: number
  echoMax: number
  banner: string
  tutorial: string
  modeLabel: string
  speed: number
  rewards: null | { lines: string[] }
  floaters: { id: string; text: string; x: number; y: number; kind: 'dmg' | 'heal' | 'weak' }[]
  party: PartyChip[]
  enemies: { uid: string; name: string; hp: number; maxHp: number; charging: string; chargeProgress: number; ultimate: boolean; boss: boolean }[]
}

export interface UiModel {
  mode: 'title' | 'play' | 'ending' | 'gameover'
  overlay: 'none' | 'menu' | 'shop' | 'gate' | 'settings' | 'rewards'
  announce: null | { kicker?: string; title: string }
  dialogue: null | { speaker: string; portrait: PortraitId; text: string }
  objective: string
  place: string
  era: Era
  gold: number
  clockOn: boolean
  playSeconds: number
  party: PartyChip[]
  hint: string
  hasSave: boolean
  cleared: boolean
  settings: Settings
  menu: null | MenuModel
  shop: null | ShopModel
  gate: null | MenuModel
  battle: null | BattleUi
  endingLines: string[]
  gameoverText: string
  showTouch: boolean
}

export interface UiHandlers {
  newGame(): void
  continueGame(): void
  confirm(): void
  cancel(): void
  select(id: string): void
  setSetting(key: string, value: string | number | boolean): void
  move(x: number, y: number): void
  press(action: 'confirm' | 'cancel' | 'menu' | 'run' | 'rewind'): void
}
