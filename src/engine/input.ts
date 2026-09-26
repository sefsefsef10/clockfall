import type { InputFrame } from '../types.ts'

export interface InputApi {
  read(): InputFrame
  setMove(x: number, y: number): void
  press(action: 'confirm' | 'cancel' | 'menu' | 'run' | 'rewind'): void
}

const DEADZONE = 0.4

/** Keys that would scroll the page if the browser handled them. */
const SCROLL_CODES: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
])

function unit(v: number): number {
  if (v > 0) return 1
  if (v < 0) return -1
  return 0
}

function stick(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v >= DEADZONE) return 1
  if (v <= -DEADZONE) return -1
  return 0
}

/**
 * Keyboard listeners hang off the element's window so WASD works when the
 * canvas is not focused. Positive y is south, matching map coordinates.
 */
export function attachInput(target: HTMLElement): InputApi {
  const view = target.ownerDocument.defaultView ?? window
  const held = new Set<string>()
  let moveX = 0
  let moveY = 0
  let runLatch = false
  let padX = 0
  let padY = 0
  let padRun = false
  const edge = { confirm: false, cancel: false, menu: false, rewind: false }
  const prev = {
    confirm: false,
    cancel: false,
    rewind: false,
    menuStart: false,
    menuFace: false,
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (SCROLL_CODES.has(e.code)) e.preventDefault()
    const fresh = !held.has(e.code) && !e.repeat
    held.add(e.code)
    if (!fresh) return
    if (e.code === 'KeyZ' || e.code === 'Enter' || e.code === 'Space') edge.confirm = true
    else if (e.code === 'KeyX' || e.code === 'Backspace') edge.cancel = true
    else if (e.code === 'Escape' || e.code === 'KeyM') edge.menu = true
    else if (e.code === 'KeyR') edge.rewind = true
  }

  function onKeyUp(e: KeyboardEvent): void {
    held.delete(e.code)
  }

  function onBlur(): void {
    held.clear()
  }

  function buttonDown(pad: Gamepad, index: number): boolean {
    const button = pad.buttons[index]
    if (!button) return false
    return button.pressed || button.value > 0.5
  }

  function clearPad(): void {
    padX = 0
    padY = 0
    padRun = false
    prev.confirm = false
    prev.cancel = false
    prev.rewind = false
    prev.menuStart = false
    prev.menuFace = false
  }

  function pollPad(): void {
    const nav = navigator
    if (typeof nav.getGamepads !== 'function') {
      clearPad()
      return
    }
    const pads = nav.getGamepads()
    let pad: Gamepad | null = null
    for (const candidate of pads) {
      if (candidate && candidate.connected) {
        pad = candidate
        break
      }
    }
    if (!pad) {
      clearPad()
      return
    }
    let x = stick(pad.axes[0] ?? 0)
    let y = stick(pad.axes[1] ?? 0)
    if (x === 0 && y === 0) {
      const right = buttonDown(pad, 15)
      const left = buttonDown(pad, 14)
      const down = buttonDown(pad, 13)
      const up = buttonDown(pad, 12)
      x = (right ? 1 : 0) - (left ? 1 : 0)
      y = (down ? 1 : 0) - (up ? 1 : 0)
    }
    padX = x
    padY = y
    const confirm = buttonDown(pad, 0)
    const cancel = buttonDown(pad, 1)
    const rewind = buttonDown(pad, 2)
    const menuStart = buttonDown(pad, 9)
    const menuFace = buttonDown(pad, 3)
    if (confirm && !prev.confirm) edge.confirm = true
    if (cancel && !prev.cancel) edge.cancel = true
    if (rewind && !prev.rewind) edge.rewind = true
    if ((menuStart && !prev.menuStart) || (menuFace && !prev.menuFace)) edge.menu = true
    prev.confirm = confirm
    prev.cancel = cancel
    prev.rewind = rewind
    prev.menuStart = menuStart
    prev.menuFace = menuFace
    padRun = buttonDown(pad, 7) || buttonDown(pad, 5)
  }

  function keyboardAxes(): { x: number; y: number; run: boolean; active: boolean } {
    const left = held.has('ArrowLeft') || held.has('KeyA')
    const right = held.has('ArrowRight') || held.has('KeyD')
    const up = held.has('ArrowUp') || held.has('KeyW')
    const down = held.has('ArrowDown') || held.has('KeyS')
    const shift = held.has('ShiftLeft') || held.has('ShiftRight')
    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
      run: shift,
      active: left || right || up || down,
    }
  }

  view.addEventListener('keydown', onKeyDown, true)
  view.addEventListener('keyup', onKeyUp)
  view.addEventListener('blur', onBlur)

  return {
    read(): InputFrame {
      try {
        pollPad()
      } catch {
        clearPad()
      }
      const keys = keyboardAxes()
      let x = keys.x
      let y = keys.y
      if (!keys.active) {
        x = padX
        y = padY
      }
      if (moveX !== 0 || moveY !== 0) {
        x = moveX
        y = moveY
      }
      const frame: InputFrame = {
        x,
        y,
        run: keys.run || padRun || runLatch,
        confirm: edge.confirm,
        cancel: edge.cancel,
        menu: edge.menu,
        rewind: edge.rewind,
      }
      edge.confirm = false
      edge.cancel = false
      edge.menu = false
      edge.rewind = false
      return frame
    },
    setMove(x: number, y: number): void {
      moveX = unit(x)
      moveY = unit(y)
    },
    press(action: 'confirm' | 'cancel' | 'menu' | 'run' | 'rewind'): void {
      switch (action) {
        case 'confirm':
          edge.confirm = true
          break
        case 'cancel':
          edge.cancel = true
          break
        case 'menu':
          edge.menu = true
          break
        case 'rewind':
          edge.rewind = true
          break
        case 'run':
          runLatch = !runLatch
          break
        default: {
          const never: never = action
          void never
        }
      }
    },
  }
}
