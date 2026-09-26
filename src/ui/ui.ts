import type { BattleUi, MenuModel, PartyChip, PortraitId, ShopModel, UiHandlers, UiModel } from '../types.ts'

type PortraitDrawer = (ctx: CanvasRenderingContext2D, id: PortraitId, frame?: number) => void

let portraitDrawer: PortraitDrawer | null = null

function bootPortraits(): void {
  const spec = '../render/sprites.ts'
  void import(/* @vite-ignore */ spec)
    .then((mod: { drawPortrait?: PortraitDrawer }) => {
      if (typeof mod.drawPortrait === 'function') portraitDrawer = mod.drawPortrait
    })
    .catch(() => {
      portraitDrawer = null
    })
}

bootPortraits()

function div(className: string): HTMLDivElement {
  const node = document.createElement('div')
  node.className = className
  return node
}

function span(className: string, text = ''): HTMLSpanElement {
  const node = document.createElement('span')
  node.className = className
  if (text) node.textContent = text
  return node
}

function setText(node: { textContent: string | null } | null, text: string): void {
  if (!node) return
  if (node.textContent !== text) node.textContent = text
}

function makeBtn(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn'
  btn.textContent = label
  btn.addEventListener('click', onClick)
  return btn
}

function ratio(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(1, current / max))
}

function setBar(bar: HTMLElement | null, value: number, low = false): void {
  if (!bar) return
  const fill = bar.firstElementChild
  if (fill instanceof HTMLElement) {
    const width = `${Math.round(value * 1000) / 10}%`
    if (fill.style.width !== width) fill.style.width = width
  }
  bar.classList.toggle('low', low)
  bar.classList.toggle('full', value >= 1)
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function paintPortrait(canvas: HTMLCanvasElement, id: PortraitId, frame: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (canvas.width !== 64) canvas.width = 64
  if (canvas.height !== 64) canvas.height = 64
  ctx.imageSmoothingEnabled = false
  try {
    if (!portraitDrawer) {
      ctx.fillStyle = '#8a6230'
      ctx.fillRect(0, 0, 64, 64)
      return
    }
    ctx.clearRect(0, 0, 64, 64)
    portraitDrawer(ctx, id, frame)
  } catch {
    ctx.fillStyle = '#8a6230'
    ctx.fillRect(0, 0, 64, 64)
  }
}

function buildChip(member: PartyChip): HTMLElement {
  const chip = div('chip')
  chip.dataset.chip = member.id
  const head = div('chip-head')
  head.append(span('name', member.name), span('lv', `Lv ${member.level}`))
  const hp = div('stat')
  hp.append(span('stat-n'), div('bar hp'))
  const hpFill = document.createElement('span')
  hp.querySelector('.bar')?.append(hpFill)
  const mp = div('stat')
  mp.append(span('stat-n'), div('bar mp'))
  const mpFill = document.createElement('span')
  mp.querySelector('.bar')?.append(mpFill)
  const atb = div('bar atb')
  atb.append(document.createElement('span'))
  chip.append(head, hp, mp, atb)
  const hpNum = hp.querySelector('.stat-n')
  if (hpNum) hpNum.setAttribute('data-hp', '')
  const mpNum = mp.querySelector('.stat-n')
  if (mpNum) mpNum.setAttribute('data-mp', '')
  return chip
}

function updateChip(chip: HTMLElement, member: PartyChip): void {
  chip.classList.toggle('down', member.down)
  setText(chip.querySelector('.name'), member.name)
  setText(chip.querySelector('.lv'), `Lv ${member.level}`)
  setText(chip.querySelector('[data-hp]'), `${member.hp}/${member.maxHp}`)
  setText(chip.querySelector('[data-mp]'), `${member.mp}/${member.maxMp}`)
  const hpRatio = ratio(member.hp, member.maxHp)
  setBar(chip.querySelector('.bar.hp'), hpRatio, hpRatio < 0.3)
  setBar(chip.querySelector('.bar.mp'), ratio(member.mp, member.maxMp))
  setBar(chip.querySelector('.bar.atb'), ratio(member.atb, 100))
  const label = `${member.name}, level ${member.level}, ${member.hp} of ${member.maxHp} hp`
  if (chip.getAttribute('aria-label') !== label) chip.setAttribute('aria-label', label)
}

function updateParty(root: ParentNode, party: PartyChip[]): void {
  for (const member of party) {
    const chip = root.querySelector<HTMLElement>(`[data-chip="${CSS.escape(member.id)}"]`)
    if (chip) updateChip(chip, member)
  }
}

function updateClock(node: HTMLElement, model: UiModel): void {
  const clock = node.querySelector<HTMLElement>('[data-clock]')
  if (!clock) return
  clock.classList.toggle('is-on', model.clockOn)
  setText(clock.querySelector('[data-read]'), formatClock(model.playSeconds))
}

function choiceRow(
  label: string,
  key: string,
  options: [string, string][],
  handlers: UiHandlers,
  kind: 'string' | 'number',
): HTMLElement {
  const row = div('setting')
  row.append(span('setting-name', label))
  const choices = div('choices')
  choices.dataset.setting = key
  for (const [value, text] of options) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'choice'
    btn.dataset.value = value
    btn.textContent = text
    btn.setAttribute('aria-pressed', 'false')
    btn.addEventListener('click', () => {
      handlers.setSetting(key, kind === 'number' ? Number(value) : value)
    })
    choices.append(btn)
  }
  row.append(choices)
  return row
}

function buildSettings(model: UiModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer modal')
  layer.setAttribute('role', 'dialog')
  layer.setAttribute('aria-label', 'Settings')
  const card = div('card settings-card')
  const title = document.createElement('h2')
  title.textContent = 'Settings'
  card.append(title)
  card.append(
    choiceRow('ATB', 'atb', [
      ['wait', 'Wait'],
      ['active', 'Active'],
    ], handlers, 'string'),
  )
  card.append(
    choiceRow('Speed', 'speed', [
      ['1', '1×'],
      ['1.5', '1.5×'],
      ['2', '2×'],
      ['3', '3×'],
    ], handlers, 'number'),
  )

  const vol = document.createElement('label')
  vol.className = 'setting'
  vol.append(span('setting-name', 'Volume'))
  const wrap = div('vol-wrap')
  const range = document.createElement('input')
  range.type = 'range'
  range.min = '0'
  range.max = '1'
  range.step = '0.05'
  range.value = String(model.settings.volume)
  range.dataset.volume = '1'
  range.setAttribute('aria-label', 'Volume')
  range.addEventListener('input', () => {
    handlers.setSetting('volume', Number(range.value))
  })
  wrap.append(range, span('vol-num'))
  const volNum = wrap.querySelector('.vol-num')
  if (volNum) volNum.setAttribute('data-vol', '')
  vol.append(wrap)
  card.append(vol)

  const shakeRow = div('setting')
  shakeRow.append(span('setting-name', 'Shake'))
  const shake = document.createElement('button')
  shake.type = 'button'
  shake.className = 'choice'
  shake.dataset.shake = '1'
  shake.textContent = 'Off'
  shake.setAttribute('aria-pressed', 'false')
  shake.addEventListener('click', () => {
    const on = shake.getAttribute('aria-pressed') === 'true'
    handlers.setSetting('shake', !on)
  })
  shakeRow.append(shake)
  card.append(shakeRow)
  card.append(
    choiceRow('Text', 'text', [
      ['slow', 'Slow'],
      ['mid', 'Mid'],
      ['fast', 'Fast'],
    ], handlers, 'string'),
  )
  card.append(makeBtn('Close', () => handlers.cancel()))
  layer.append(card)
  return layer
}

function updateSettings(root: HTMLElement, model: UiModel): void {
  const settings = model.settings
  markChoice(root, 'atb', settings.atb)
  markChoice(root, 'speed', String(settings.speed))
  markChoice(root, 'text', settings.text)
  const shake = root.querySelector<HTMLButtonElement>('[data-shake]')
  if (shake) {
    shake.setAttribute('aria-pressed', settings.shake ? 'true' : 'false')
    setText(shake, settings.shake ? 'On' : 'Off')
  }
  const range = root.querySelector<HTMLInputElement>('[data-volume]')
  if (range && document.activeElement !== range && Math.abs(Number(range.value) - settings.volume) > 0.001) {
    range.value = String(settings.volume)
  }
  setText(root.querySelector('[data-vol]'), `${Math.round(settings.volume * 100)}%`)
}

function markChoice(root: HTMLElement, key: string, value: string): void {
  const group = root.querySelector<HTMLElement>(`[data-setting="${key}"]`)
  if (!group) return
  group.querySelectorAll<HTMLButtonElement>('.choice').forEach((btn) => {
    const on =
      key === 'speed'
        ? Math.abs(Number(btn.dataset.value) - Number(value)) < 0.001
        : btn.dataset.value === value
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
}

function buildTitle(model: UiModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer title')
  const card = div('title-card')
  const dial = div('dial')
  dial.setAttribute('aria-hidden', 'true')
  const kicker = div('kicker')
  kicker.textContent = 'A TIME-BATTLE TALE'
  const word = document.createElement('h1')
  word.className = 'wordmark'
  word.textContent = 'CLOCKFALL'
  const tag = document.createElement('p')
  tag.className = 'tagline'
  tag.textContent = 'Three ages. One stopped second. The fair is still open.'
  card.append(dial, kicker, word, tag)
  if (model.cleared) {
    const stamp = div('stamp')
    stamp.textContent = 'The clock is running'
    card.append(stamp)
  }
  const actions = div('title-actions')
  actions.append(makeBtn('New chronicle', () => handlers.newGame()))
  const cont = makeBtn('Continue', () => handlers.continueGame())
  cont.disabled = !model.hasSave
  actions.append(cont, makeBtn('Settings', () => handlers.select('settings')))
  card.append(actions)
  layer.append(card)
  return layer
}

function buildHud(model: UiModel, handlers: UiHandlers): HTMLElement {
  const layer = div(`layer hud${touchShown(model) ? ' has-touch' : ''}`)
  const top = div('topbar')
  const where = div('hud-chip where')
  where.append(span('place'), span('objective'))
  const side = div('hud-side')
  const clock = div('clock hud-chip')
  clock.dataset.clock = '1'
  const face = span('clock-face')
  face.setAttribute('aria-hidden', 'true')
  clock.append(face, span('read'))
  const read = clock.querySelector('.read')
  if (read) read.setAttribute('data-read', '')
  side.append(clock, span('gold hud-chip'))
  const gold = side.querySelector('.gold')
  if (gold) gold.setAttribute('data-gold', '')
  top.append(where, side)
  const foot = div('hud-foot')
  const party = div('party')
  for (const member of model.party) party.append(buildChip(member))
  foot.append(party)
  if (touchShown(model)) foot.append(buildTouch(handlers))
  else foot.append(span('hint'))
  layer.append(top, foot)
  return layer
}

function updateHud(node: HTMLElement, model: UiModel): void {
  setText(node.querySelector('.place'), model.place)
  setText(node.querySelector('.objective'), model.objective)
  setText(node.querySelector('[data-gold]'), `${model.gold} marks`)
  const hint = node.querySelector<HTMLElement>('.hint')
  if (hint) {
    setText(hint, model.hint)
    hint.hidden = model.showTouch || !model.hint
  }
  updateClock(node, model)
  updateParty(node, model.party)
}

function bindPad(button: HTMLButtonElement, x: number, y: number, handlers: UiHandlers): void {
  const release = (event: PointerEvent) => {
    if (button.dataset.held !== String(event.pointerId)) return
    delete button.dataset.held
    handlers.move(0, 0)
  }
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    button.dataset.held = String(event.pointerId)
    try {
      button.setPointerCapture(event.pointerId)
    } catch {
      /* capture can fail if the pointer already ended */
    }
    handlers.move(x, y)
  })
  button.addEventListener('pointerup', release)
  button.addEventListener('pointercancel', release)
  button.addEventListener('pointerleave', release)
}

function buildTouch(handlers: UiHandlers): HTMLElement {
  const layer = div('touch-row')
  const dpad = div('dpad')
  dpad.setAttribute('role', 'group')
  dpad.setAttribute('aria-label', 'Move')
  const dirs: [string, string, number, number][] = [
    ['up', 'Up', 0, -1],
    ['left', 'Left', -1, 0],
    ['right', 'Right', 1, 0],
    ['down', 'Down', 0, 1],
  ]
  const glyphs: Record<string, string> = { up: '▲', left: '◀', right: '▶', down: '▼' }
  for (const [dir, label, x, y] of dirs) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `pad ${dir}`
    btn.setAttribute('aria-label', label)
    btn.textContent = glyphs[dir] ?? ''
    bindPad(btn, x, y, handlers)
    dpad.append(btn)
  }
  const actions = div('actions')
  const acts: ['confirm' | 'cancel' | 'menu' | 'run', string][] = [
    ['confirm', 'Confirm'],
    ['cancel', 'Cancel'],
    ['menu', 'Menu'],
    ['run', 'Run'],
  ]
  for (const [action, label] of acts) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn act'
    btn.textContent = label
    btn.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      handlers.press(action)
    })
    actions.append(btn)
  }
  layer.append(dpad, actions)
  return layer
}

let portraitFrame = 0

function buildDialogue(model: UiModel, handlers: UiHandlers): HTMLElement {
  const dialogue = model.dialogue
  const layer = div('layer dialogue-layer')
  const panel = document.createElement('button')
  panel.type = 'button'
  panel.className = 'dialogue'
  panel.addEventListener('click', () => handlers.confirm())
  const canvas = document.createElement('canvas')
  canvas.className = 'portrait'
  canvas.width = 64
  canvas.height = 64
  const body = div('dialogue-body')
  const speaker = span('speaker', dialogue?.speaker ?? '')
  const text = document.createElement('p')
  text.className = 'line'
  text.textContent = dialogue?.text ?? ''
  body.append(speaker, text)
  const mark = span('advance', '▼')
  mark.setAttribute('aria-hidden', 'true')
  panel.append(canvas, body, mark)
  layer.append(panel)
  if (dialogue) paintPortrait(canvas, dialogue.portrait, portraitFrame)
  return layer
}

function updateDialogue(node: HTMLElement, model: UiModel): void {
  const dialogue = model.dialogue
  const canvas = node.querySelector('canvas')
  if (!dialogue || !(canvas instanceof HTMLCanvasElement)) return
  portraitFrame += 1
  paintPortrait(canvas, dialogue.portrait, portraitFrame)
}

function rowButton(id: string, handlers: UiHandlers, withPrice: boolean): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'row'
  btn.dataset.row = '1'
  btn.dataset.id = id
  btn.append(span('lbl'), span('detail'))
  if (withPrice) btn.append(span('price'))
  btn.addEventListener('click', () => {
    if (btn.disabled) return
    const picked = btn.dataset.id
    if (picked) handlers.select(picked)
  })
  return btn
}

function syncRows(
  root: ParentNode,
  rows: { label: string; detail?: string; disabled?: boolean; price?: number }[],
  index: number,
): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-row]')
  buttons.forEach((btn, i) => {
    const row = rows[i]
    if (!row) return
    const on = i === index
    btn.classList.toggle('is-on', on)
    btn.disabled = !!row.disabled
    if (on) btn.setAttribute('aria-current', 'true')
    else btn.removeAttribute('aria-current')
    setText(btn.querySelector('.lbl'), row.label)
    const detail = btn.querySelector<HTMLElement>('.detail')
    if (detail) {
      setText(detail, row.detail ?? '')
      detail.hidden = !row.detail
    }
    if (row.price != null) setText(btn.querySelector('.price'), `${row.price} marks`)
  })
}

function buildMenu(menu: MenuModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer modal')
  layer.setAttribute('role', 'dialog')
  layer.setAttribute('aria-label', menu.title)
  const card = div('card')
  const title = document.createElement('h2')
  title.textContent = menu.title
  const list = div('rows')
  for (const row of menu.rows) list.append(rowButton(row.id, handlers, false))
  const aside = document.createElement('p')
  aside.className = 'aside'
  card.append(title, list, aside)
  layer.append(card)
  return layer
}

function updateMenu(node: HTMLElement, menu: MenuModel): void {
  syncRows(node, menu.rows, menu.index)
  const aside = node.querySelector<HTMLElement>('.aside')
  if (!aside) return
  setText(aside, menu.aside ?? '')
  aside.hidden = !menu.aside
}

function buildShop(shop: ShopModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer modal')
  layer.setAttribute('role', 'dialog')
  layer.setAttribute('aria-label', shop.title)
  const card = div('card')
  const title = document.createElement('h2')
  title.textContent = shop.title
  const gold = span('shop-gold')
  gold.dataset.gold = ''
  const list = div('rows')
  for (const row of shop.rows) list.append(rowButton(row.id, handlers, true))
  const aside = document.createElement('p')
  aside.className = 'aside'
  card.append(title, gold, list, aside)
  layer.append(card)
  return layer
}

function updateShop(node: HTMLElement, shop: ShopModel): void {
  setText(node.querySelector('[data-gold]'), `${shop.gold} marks`)
  syncRows(node, shop.rows, shop.index)
  const aside = node.querySelector<HTMLElement>('.aside')
  if (!aside) return
  setText(aside, shop.aside ?? '')
  aside.hidden = !shop.aside
}

function buildRewardFallback(lines: string[], handlers: UiHandlers): HTMLElement {
  const layer = div('layer modal')
  layer.setAttribute('role', 'dialog')
  layer.setAttribute('aria-label', 'Rewards')
  const card = div('card')
  const title = document.createElement('h2')
  title.textContent = 'Rewards'
  const list = document.createElement('ul')
  list.className = 'reward-lines'
  for (const line of lines) {
    const item = document.createElement('li')
    item.textContent = line
    list.append(item)
  }
  card.append(title, list, makeBtn('Continue', () => handlers.select('continue')))
  layer.append(card)
  return layer
}

function commandButton(id: string, handlers: UiHandlers): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cmd'
  btn.dataset.id = id
  btn.append(span('lbl'), span('detail'))
  btn.addEventListener('click', () => {
    if (btn.disabled) return
    const picked = btn.dataset.id
    if (picked) handlers.select(picked)
  })
  return btn
}

function buildBattle(model: UiModel, handlers: UiHandlers): HTMLElement {
  const battle = model.battle
  const layer = div('layer battle')
  const enemies = div('enemies')
  for (const enemy of battle?.enemies ?? []) {
    const card = div(enemy.boss ? 'enemy boss' : 'enemy')
    const head = div('enemy-top')
    head.append(span('enemy-name', enemy.name), span('hp-num'))
    const bar = div('bar hp')
    bar.append(document.createElement('span'))
    const charge = span('charge')
    charge.hidden = true
    card.append(head, bar, charge)
    enemies.append(card)
  }

  const meta = div('battle-meta')
  meta.append(span('mode-label'), span('speed-label'), span('echo-count'), div('pips'))
  const clock = div('clock mini')
  clock.dataset.clock = '1'
  clock.append(span('read'))
  const read = clock.querySelector('.read')
  if (read) read.setAttribute('data-read', '')
  meta.append(clock)

  const banner = div('banner')
  banner.hidden = true
  const tutorial = div('tutorial')
  tutorial.hidden = true
  const floaters = div('floaters')
  const log = div('log')
  const rewards = div('rewards')
  rewards.hidden = true
  const heading = document.createElement('h2')
  const rewardList = document.createElement('ul')
  rewardList.className = 'reward-lines'
  rewards.append(heading, rewardList)

  const party = div('party battle-party')
  for (const member of battle?.party ?? []) party.append(buildChip(member))

  const dock = div('command-dock')
  const dockLabel = div('dock-label')
  dockLabel.textContent = 'Choose a target'
  dockLabel.hidden = true
  const targets = div('targets')
  for (const target of battle?.targets ?? []) targets.append(commandButton(target.id, handlers))
  const commands = div('commands')
  for (const command of battle?.commands ?? []) commands.append(commandButton(command.id, handlers))
  dock.append(dockLabel, targets, commands)

  layer.append(enemies, meta, banner, tutorial, floaters, log, rewards, party, dock)
  return layer
}

const floaterMaps = new WeakMap<HTMLElement, Map<string, HTMLElement>>()

function updateFloaters(host: HTMLElement, floaters: BattleUi['floaters']): void {
  let map = floaterMaps.get(host)
  if (!map) {
    map = new Map()
    floaterMaps.set(host, map)
  }
  const seen = new Set<string>()
  for (const floater of floaters) {
    seen.add(floater.id)
    let node = map.get(floater.id)
    if (!node) {
      node = div(`floater ${floater.kind}`)
      node.textContent = floater.text
      host.append(node)
      map.set(floater.id, node)
    }
    if (!node.classList.contains(floater.kind)) node.className = `floater ${floater.kind}`
    setText(node, floater.text)
    node.style.left = `${floater.x * 100}%`
    node.style.top = `${floater.y * 100}%`
  }
  for (const [id, node] of map) {
    if (seen.has(id)) continue
    node.remove()
    map.delete(id)
  }
}

function updateCommandButtons(
  root: HTMLElement,
  rows: { label: string; detail?: string; disabled?: boolean }[],
  index: number,
): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('.cmd')
  buttons.forEach((btn, i) => {
    const row = rows[i]
    if (!row) return
    const on = i === index
    btn.classList.toggle('is-on', on)
    btn.disabled = !!row.disabled
    if (on) btn.setAttribute('aria-current', 'true')
    else btn.removeAttribute('aria-current')
    setText(btn.querySelector('.lbl'), row.label)
    const detail = btn.querySelector<HTMLElement>('.detail')
    if (!detail) return
    const text = row.detail ?? ''
    setText(detail, text)
    detail.hidden = !text
  })
}

function updateBattle(node: HTMLElement, model: UiModel): void {
  const battle = model.battle
  if (!battle) return
  node.dataset.phase = battle.phase
  const cards = node.querySelectorAll<HTMLElement>('.enemy')
  battle.enemies.forEach((enemy, i) => {
    const card = cards[i]
    if (!card) return
    card.classList.toggle('boss', enemy.boss)
    setText(card.querySelector('.enemy-name'), enemy.name)
    setText(card.querySelector('.hp-num'), `${enemy.hp}/${enemy.maxHp}`)
    const hpRatio = ratio(enemy.hp, enemy.maxHp)
    setBar(card.querySelector('.bar.hp'), hpRatio, hpRatio < 0.3)
    const charge = card.querySelector<HTMLElement>('.charge')
    if (charge) {
      setText(charge, enemy.charging)
      charge.hidden = !enemy.charging
    }
  })
  setText(node.querySelector('.mode-label'), battle.modeLabel)
  setText(node.querySelector('.speed-label'), `×${battle.speed}`)
  setText(node.querySelector('.echo-count'), `${battle.echoes}/${battle.echoMax}`)
  const pips = node.querySelector<HTMLElement>('.pips')
  if (pips) {
    const key = `${battle.echoes}/${battle.echoMax}`
    if (pips.dataset.echo !== key) {
      pips.dataset.echo = key
      pips.replaceChildren()
      pips.setAttribute('aria-label', `${battle.echoes} of ${battle.echoMax} echoes`)
      for (let i = 0; i < battle.echoMax; i += 1) {
        const pip = document.createElement('i')
        pip.className = i < battle.echoes ? 'pip on' : 'pip'
        pips.append(pip)
      }
    }
  }
  const banner = node.querySelector<HTMLElement>('.banner')
  if (banner) {
    setText(banner, battle.banner)
    banner.hidden = !battle.banner
  }
  const tutorial = node.querySelector<HTMLElement>('.tutorial')
  if (tutorial) {
    setText(tutorial, battle.tutorial)
    tutorial.hidden = !battle.tutorial
  }
  const log = node.querySelector<HTMLElement>('.log')
  if (log) {
    const last = battle.log.slice(-3)
    const key = last.join('\n')
    if (log.dataset.log !== key) {
      log.dataset.log = key
      log.replaceChildren()
      for (const line of last) {
        const p = document.createElement('p')
        p.textContent = line
        log.append(p)
      }
    }
  }
  const rewards = node.querySelector<HTMLElement>('.rewards')
  if (rewards) {
    const show =
      (battle.phase === 'victory' || battle.phase === 'defeat' || battle.phase === 'flee') &&
      !!battle.rewards?.lines.length
    rewards.hidden = !show
    if (show && battle.rewards) {
      const key = `${battle.phase}\n${battle.rewards.lines.join('\n')}`
      if (rewards.dataset.lines !== key) {
        rewards.dataset.lines = key
        const heading =
          battle.phase === 'victory' ? 'Victory' : battle.phase === 'defeat' ? 'Defeat' : 'Fled'
        setText(rewards.querySelector('h2'), heading)
        const list = rewards.querySelector('.reward-lines')
        if (list) {
          list.replaceChildren()
          for (const line of battle.rewards.lines) {
            const item = document.createElement('li')
            item.textContent = line
            list.append(item)
          }
        }
      }
    }
  }
  const floaters = node.querySelector<HTMLElement>('.floaters')
  if (floaters) updateFloaters(floaters, battle.floaters)
  updateParty(node, battle.party)
  updateClock(node, model)
  const dockLabel = node.querySelector<HTMLElement>('.dock-label')
  const targets = node.querySelector<HTMLElement>('.targets')
  const commands = node.querySelector<HTMLElement>('.commands')
  if (dockLabel) dockLabel.hidden = !battle.pickingTarget
  if (targets) targets.hidden = !battle.pickingTarget
  if (commands) commands.hidden = battle.pickingTarget
  if (battle.pickingTarget && targets) updateCommandButtons(targets, battle.targets, battle.targetIndex)
  if (!battle.pickingTarget && commands) updateCommandButtons(commands, battle.commands, battle.commandIndex)
}

function buildAnnounce(model: UiModel): HTMLElement {
  const layer = div('layer announce')
  const card = div('announce-card')
  card.setAttribute('aria-live', 'polite')
  if (model.announce?.kicker) {
    const kicker = div('kicker')
    kicker.textContent = model.announce.kicker
    card.append(kicker)
  }
  const title = div('announce-title')
  title.textContent = model.announce?.title ?? ''
  card.append(title)
  layer.append(card)
  return layer
}

function buildEnding(model: UiModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer ending')
  const col = div('ending-col')
  model.endingLines.forEach((line, i) => {
    const p = document.createElement('p')
    p.className = i === 0 ? 'ending-lead' : 'ending-line'
    p.textContent = line
    col.append(p)
  })
  col.append(makeBtn('Back to the title', () => handlers.select('title')))
  layer.append(col)
  return layer
}

function buildGameover(model: UiModel, handlers: UiHandlers): HTMLElement {
  const layer = div('layer gameover')
  const col = div('gameover-col')
  const text = document.createElement('p')
  text.className = 'gameover-text'
  text.textContent = model.gameoverText
  const actions = div('title-actions')
  actions.append(
    makeBtn('Pull the second back', () => handlers.select('retry')),
    makeBtn('Title', () => handlers.select('title')),
  )
  col.append(text, actions)
  layer.append(col)
  return layer
}

function titleSig(model: UiModel): string {
  if (model.mode !== 'title' || model.battle || model.overlay !== 'none') return ''
  return `title:${model.hasSave ? 1 : 0}:${model.cleared ? 1 : 0}`
}

function touchShown(model: UiModel): boolean {
  return model.mode === 'play' && model.showTouch && !model.battle && !model.dialogue && model.overlay === 'none'
}

function hudSig(model: UiModel): string {
  if (model.mode !== 'play' || model.battle) return ''
  return `${model.party.map((p) => p.id).join(',')}:${touchShown(model) ? 1 : 0}`
}

function dialogueSig(model: UiModel): string {
  if (!model.dialogue || model.mode === 'ending' || model.mode === 'gameover') return ''
  return `${model.dialogue.speaker}\n${model.dialogue.portrait}\n${model.dialogue.text}`
}

function menuSheet(model: UiModel): MenuModel | null {
  if (model.mode === 'ending' || model.mode === 'gameover') return null
  if (model.overlay === 'menu' || model.overlay === 'rewards') return model.menu
  if (model.overlay === 'gate') return model.menu ?? model.gate
  return null
}

function menuSig(model: UiModel): string {
  const sheet = menuSheet(model)
  if (sheet && (model.overlay === 'menu' || model.overlay === 'gate' || model.overlay === 'rewards')) {
    return `${model.overlay}:${sheet.title}:${sheet.rows.map((row) => row.id).join('|')}`
  }
  if (model.overlay === 'rewards' && model.battle?.rewards && model.mode !== 'ending' && model.mode !== 'gameover') {
    return `rewards:${model.battle.rewards.lines.join('\n')}`
  }
  return ''
}

function shopSig(model: UiModel): string {
  if (model.mode === 'ending' || model.mode === 'gameover') return ''
  if (model.overlay !== 'shop' || !model.shop) return ''
  return `${model.shop.title}:${model.shop.rows.map((row) => row.id).join('|')}`
}

function battleSig(model: UiModel): string {
  const battle = model.battle
  if (!battle || model.mode !== 'play') return ''
  return [
    battle.phase,
    battle.pickingTarget ? 'target' : 'command',
    battle.commands.map((command) => command.id).join(','),
    battle.targets.map((target) => target.id).join(','),
    battle.enemies.map((enemy) => enemy.uid).join(','),
    battle.party.map((member) => member.id).join(','),
  ].join('§')
}

function announceSig(model: UiModel): string {
  if (model.mode !== 'play' || !model.announce) return ''
  return `${model.announce.kicker ?? ''}\n${model.announce.title}`
}

function endingSig(model: UiModel): string {
  if (model.mode !== 'ending') return ''
  return `${model.endingLines.length}:${model.endingLines.join('\n')}`
}

function gameoverSig(model: UiModel): string {
  if (model.mode !== 'gameover') return ''
  return model.gameoverText
}

export function mountUi(root: HTMLElement, handlers: UiHandlers): { render(model: UiModel): void } {
  root.replaceChildren()
  const stack = div('stack')
  root.append(stack)
  const slots = new Map<string, { sig: string; node: HTMLElement | null }>()

  function layer(name: string, sig: string, build: () => HTMLElement, update?: (node: HTMLElement) => void): void {
    let slot = slots.get(name)
    if (!slot) {
      slot = { sig: '\u0000', node: null }
      slots.set(name, slot)
    }
    if (slot.sig !== sig) {
      slot.node?.remove()
      slot.node = null
      slot.sig = sig
      if (sig) {
        const node = build()
        node.dataset.layer = name
        stack.append(node)
        slot.node = node
      }
    }
    if (slot.node && update) update(slot.node)
  }

  return {
    render(model: UiModel) {
      layer('title', titleSig(model), () => buildTitle(model, handlers))
      layer('hud', hudSig(model), () => buildHud(model, handlers), (node) => updateHud(node, model))
      layer('battle', battleSig(model), () => buildBattle(model, handlers), (node) => updateBattle(node, model))
      layer('announce', announceSig(model), () => buildAnnounce(model))
      layer('dialogue', dialogueSig(model), () => buildDialogue(model, handlers), (node) => updateDialogue(node, model))
      const settingsOn = model.overlay === 'settings' && model.mode !== 'ending' && model.mode !== 'gameover'
      layer('settings', settingsOn ? 'settings' : '', () => buildSettings(model, handlers), (node) => updateSettings(node, model))
      const menuKey = menuSig(model)
      layer(
        'menu',
        menuKey,
        () => {
          const sheet = menuSheet(model)
          if (sheet) return buildMenu(sheet, handlers)
          return buildRewardFallback(model.battle?.rewards?.lines ?? [], handlers)
        },
        (node) => {
          const sheet = menuSheet(model)
          if (sheet) updateMenu(node, sheet)
        },
      )
      layer('shop', shopSig(model), () => (model.shop ? buildShop(model.shop, handlers) : div('layer')), (node) => {
        if (model.shop) updateShop(node, model.shop)
      })
      layer('ending', endingSig(model), () => buildEnding(model, handlers))
      layer('gameover', gameoverSig(model), () => buildGameover(model, handlers))
    },
  }
}
