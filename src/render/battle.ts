import type { BattleDrawActor, Element, Era, SpriteId } from '../types.ts'
import { VIEW_H, VIEW_W } from '../const.ts'
import { drawSprite } from './sprites.ts'

function blot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const steps = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))))
  ctx.fillStyle = color
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    ctx.fillRect(Math.round(x0 + dx * t), Math.round(y0 + dy * t), 1, 1)
  }
}

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let deg = 0; deg < 360; deg += 4) {
    const a = (deg * Math.PI) / 180
    dot(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, color)
  }
}

function tri(ctx: CanvasRenderingContext2D, apexX: number, apexY: number, base: number, height: number, color: string): void {
  ctx.fillStyle = color
  for (let i = 0; i < height; i++) {
    const w = Math.max(1, Math.round((base * i) / height))
    ctx.fillRect(Math.round(apexX - w / 2), Math.round(apexY + i), w, 1)
  }
}

function floorBand(
  ctx: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  light: string,
  dark: string,
  era: Era,
): void {
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    const half = 90 + t * 210
    const x = Math.round(VIEW_W / 2 - half)
    const span = Math.round(half * 2)
    blot(ctx, x, y, span, 1, y % 8 === 0 ? dark : light)
    if ((y * 3) % 5 === 0) dot(ctx, x + ((y * 13) % Math.max(1, span - 2)), y, dark)
    if (era === 'void' && y % 6 === 0) {
      const cx = x + ((y * 17) % Math.max(1, span - 4))
      dot(ctx, cx, y, '#d7c07a')
      dot(ctx, cx + 1, y, '#d7c07a')
    }
    if (era === 'past') blot(ctx, VIEW_W / 2 - 20, y, 40, 1, y % 6 === 0 ? '#d7c07a' : '#7a2e3b')
  }
}

function skyBands(ctx: CanvasRenderingContext2D, y0: number, y1: number, colors: readonly string[]): void {
  const span = Math.max(1, y1 - y0)
  for (let i = 0; i < colors.length; i++) {
    const y = y0 + Math.floor((i * span) / colors.length)
    const next = y0 + Math.floor(((i + 1) * span) / colors.length)
    const color = colors[i]
    if (color) blot(ctx, -16, y, VIEW_W + 32, Math.max(1, next - y), color)
  }
}

function paintBackdrop(ctx: CanvasRenderingContext2D, era: Era, time: number): void {
  // The perspective floor leaves triangular shoulders. Clear those and the shake
  // overscan every frame so the previous field scene cannot show through.
  let ground: string
  switch (era) {
    case 'present': ground = '#4e7c34'; break
    case 'future': ground = '#4a433c'; break
    case 'past': ground = '#6e7080'; break
    case 'void': ground = '#1b1a33'; break
    default: {
      const unreachable: never = era
      void unreachable
      ground = '#1b1a33'
    }
  }
  blot(ctx, -16, -16, VIEW_W + 32, VIEW_H + 32, ground)
  if (era === 'present') {
    skyBands(ctx, -16, 120, ['#3e78a8', '#5e97c4', '#87b8d4', '#e2a56a', '#f0c48a', '#f6e2b8'])
    blot(ctx, 360, 28, 18, 18, '#f2d15a')
    blot(ctx, 364, 32, 10, 10, '#f6e2b8')
    tri(ctx, 70, 78, 70, 36, '#2f6b3a')
    tri(ctx, 120, 86, 50, 28, '#3e8a4a')
    tri(ctx, 400, 80, 80, 40, '#2a5424')
    blot(ctx, 40, 100, 22, 16, '#efe6d0')
    tri(ctx, 51, 82, 26, 18, '#8c3d32')
    floorBand(ctx, 78, VIEW_H + 16, '#6ea84a', '#4e7c34', era)
    for (let i = 0; i < 18; i++) {
      const x = 30 + ((i * 47 + Math.floor(time)) % 440)
      const y = 150 + (i * 13) % 90
      dot(ctx, x, y, i % 2 ? '#8fbf5e' : '#3f7a32')
    }
    return
  }
  if (era === 'future') {
    skyBands(ctx, -16, 130, ['#1a1614', '#2e2926', '#4a403c', '#6d645c', '#8aa0a8'])
    blot(ctx, 30, 36, 28, 70, '#3a342f')
    blot(ctx, 36, 28, 10, 12, '#2e2926')
    blot(ctx, 48, 60, 8, 18, '#1a1614')
    blot(ctx, 400, 24, 36, 90, '#4a403c')
    blot(ctx, 410, 40, 10, 16, '#7ec8c3')
    blot(ctx, 300, 70, 40, 30, '#5c4636')
    blot(ctx, 312, 78, 14, 10, '#a24b32')
    ctx.save()
    ctx.globalAlpha = 0.35
    blot(ctx, -16, 90, VIEW_W + 32, 40, '#7ec8c3')
    ctx.restore()
    floorBand(ctx, 86, VIEW_H + 16, '#6d645c', '#4a433c', era)
    for (let i = 0; i < 10; i++) {
      blot(ctx, 20 + i * 48, 200 + (i % 3) * 8, 8 + (i % 4), 4, i % 2 ? '#a24b32' : '#8aa0a8')
    }
    return
  }
  if (era === 'past') {
    skyBands(ctx, -16, 200, ['#14121a', '#1c1a22', '#2a2830', '#3a3844'])
    for (const x of [28, 92, 388, 444]) {
      blot(ctx, x, 10, 18, 120, '#8d8f99')
      blot(ctx, x, 10, 4, 120, '#5c5e68')
      blot(ctx, x - 4, 8, 26, 8, '#c5c7d0')
      blot(ctx, x - 2, 120, 22, 6, '#6e7080')
    }
    blot(ctx, 210, 20, 8, 36, '#d7c07a')
    tri(ctx, 214, 52, 16, 10, '#7a2e3b')
    blot(ctx, 250, 24, 8, 30, '#d7c07a')
    tri(ctx, 254, 50, 16, 10, '#7a2e3b')
    floorBand(ctx, 78, VIEW_H + 16, '#8d8f99', '#6e7080', era)
    return
  }
  blot(ctx, -16, -16, VIEW_W + 32, VIEW_H + 32, '#1b1a33')
  ring(ctx, 240, 118, 100, 78, 'rgba(215,192,122,0.45)')
  ring(ctx, 240, 118, 78, 58, 'rgba(126,200,195,0.35)')
  const ang = time * 0.15
  line(ctx, 240, 118, 240 + Math.cos(ang) * 70, 118 + Math.sin(ang) * 52, '#d7c07a')
  line(ctx, 240, 118, 240 + Math.cos(ang / 12 - Math.PI / 2) * 46, 118 + Math.sin(ang / 12 - Math.PI / 2) * 34, '#efe6d0')
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const inner = i % 2 === 0 ? 92 : 96
    line(
      ctx,
      240 + Math.cos(a) * inner,
      118 + Math.sin(a) * inner * 0.78,
      240 + Math.cos(a) * 104,
      118 + Math.sin(a) * 104 * 0.78,
      '#d7c07a',
    )
  }
  floorBand(ctx, 70, VIEW_H + 16, '#24233a', '#1b1a33', era)
  for (let i = 0; i < 16; i++) {
    const x = 40 + (i * 53) % 400
    const y = 180 + (i * 17) % 70
    line(ctx, x, y, x + 6 + (i % 3), y + (i % 2), '#d7c07a')
  }
}

function paintBattleDetails(ctx: CanvasRenderingContext2D, era: Era, time: number): void {
  if (era === 'present') {
    // Sunlit lane: hedgerows, pennants and scattered wildflowers.
    for (let i = 0; i < 10; i++) {
      const x = 12 + i * 49
      const y = 111 + (i % 3) * 6
      blot(ctx, x, y, 22, 4, '#2a5424')
      blot(ctx, x + 3, y - 3, 15, 4, '#3f7a32')
      dot(ctx, x + 9, y - 3, '#8fbf5e')
    }
    line(ctx, 14, 42, 110, 55, '#7d5a3a')
    for (let i = 0; i < 6; i++) {
      const x = 22 + i * 15
      tri(ctx, x, 46 + i * 2, 8, 8, i % 2 ? '#f2d15a' : '#e07aa0')
    }
    for (let i = 0; i < 22; i++) {
      const x = 18 + (i * 71) % 450
      const y = 146 + (i * 29) % 98
      dot(ctx, x, y, i % 3 === 0 ? '#f4f0e6' : '#f2d15a')
      dot(ctx, x, y + 1, '#3f7a32')
    }
  } else if (era === 'future') {
    // Broken industrial horizon and isolated emergency beacons.
    for (let i = 0; i < 7; i++) {
      const x = 35 + i * 69
      const h = 17 + (i * 11) % 24
      blot(ctx, x, 112 - h, 10, h, i % 2 ? '#3a342f' : '#4a403c')
      blot(ctx, x + 3, 112 - h - 3, 4, 3, '#2e2926')
      if (i % 2 === 0) blot(ctx, x + 3, 100 - h / 2, 3, 2, Math.sin(time * 3 + i) > 0 ? '#7ec8c3' : '#385e5c')
    }
    for (let i = 0; i < 16; i++) {
      const x = 14 + (i * 83) % 450
      const y = 142 + (i * 37) % 120
      line(ctx, x, y, x + 4 + (i % 3), y + 2, '#4a433c')
      if (i % 4 === 0) dot(ctx, x + 6, y + 2, '#a24b32')
    }
    ctx.save()
    ctx.globalAlpha = 0.45
    for (let i = 0; i < 17; i++) {
      const x = (i * 61 - time * (5 + i % 3) + VIEW_W * 10) % VIEW_W
      const y = (i * 47 + time * 9) % VIEW_H
      dot(ctx, x, y, '#c4b48a')
    }
    ctx.restore()
  } else if (era === 'past') {
    // Cathedral windows cast broken gold across the stone aisle.
    for (const x of [70, 156, 310, 396]) {
      blot(ctx, x, 24, 20, 48, '#4a3c48')
      blot(ctx, x + 3, 28, 14, 37, '#7a2e3b')
      blot(ctx, x + 9, 27, 2, 40, '#d7c07a')
      blot(ctx, x + 3, 45, 14, 2, '#d7c07a')
      blot(ctx, x + 1, 22, 18, 3, '#c5c7d0')
    }
    for (let i = 0; i < 8; i++) {
      const x = 42 + i * 57
      const y = 152 + (i % 3) * 18
      line(ctx, x, y, x + 17, y + 25, '#b8a87c')
      dot(ctx, x + 4, y + 7, '#e2d4a9')
    }
    for (let i = 0; i < 12; i++) {
      const x = (i * 71 + time * 3) % VIEW_W
      const y = 16 + (i * 53) % 130
      dot(ctx, x, y, '#c5c7d0')
    }
  } else {
    // A clock face under the arena: its fragments drift independently.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 0.025
      const x = 240 + Math.cos(a) * 176
      const y = 132 + Math.sin(a) * 92
      line(ctx, x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 5, '#8f805e')
    }
    for (let i = 0; i < 14; i++) {
      const x = 12 + (i * 67) % 455
      const y = 142 + (i * 23) % 113
      const offset = Math.sin(time * 1.4 + i * 2) * 2
      line(ctx, x, y + offset, x + 5, y + offset - 1, '#645c78')
      dot(ctx, x + 2, y + offset, i % 2 ? '#7ec8c3' : '#d7c07a')
    }
  }
}

function liftOf(id: SpriteId, boss: boolean): number {
  let h = 40
  if (id === 'stillness') h = 64
  else if (id === 'saint') h = 56
  else if (id === 'wraith') h = 48
  else if (id === 'minute') h = 44
  else if (id === 'hour') h = 40
  else if (id === 'kid') h = 34
  else if (id === 'chest' || id === 'chest-open') h = 28
  else if (id === 'hound' || id === 'gnatcoil' || id === 'clockmite') h = 34
  if (boss) h = Math.round(h * 1.35)
  return h
}

function bang(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  blot(ctx, x, y, 2, 2, '#f2d15a')
  blot(ctx, x, y + 3, 2, 2, '#f2d15a')
  blot(ctx, x, y + 6, 2, 2, '#e07a32')
  blot(ctx, x, y + 10, 2, 2, '#fff8ee')
}

function chargeMark(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let i = 0; i < 3; i++) {
    const p = (time * 1.4 + i * 0.33) % 1
    ctx.save()
    ctx.globalAlpha = 1 - p
    ring(ctx, x, y, 8 + p * 18, 4 + p * 8, i === 2 ? '#e23b32' : '#f2d15a')
    ctx.restore()
  }
  bang(ctx, x - 1, y - 28)
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, ratio: number): void {
  const clamped = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0
  const bx = Math.round(x - 10)
  const by = Math.round(y + 3)
  blot(ctx, bx, by, 20, 3, '#1a120e')
  const fill = Math.round(20 * clamped)
  if (fill > 0) blot(ctx, bx, by, fill, 3, clamped > 0.35 ? '#d7c07a' : '#c23b2e')
}

function place(actor: BattleDrawActor, ally: boolean): { x: number; y: number } {
  const x = ally ? 100 : 360
  const y = (ally ? 168 + actor.slot * 28 : 78 + actor.slot * 46) - (actor.boss ? 14 : 0)
  return { x, y }
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  actor: BattleDrawActor,
  ally: boolean,
  time: number,
): void {
  const spot = place(actor, ally)
  const pose = actor.pose
  const bob = pose === 'idle' ? Math.round(Math.sin(time * 2.5 + actor.slot * 0.8) * 1) : 0
  const ox = pose === 'act' ? (ally ? 10 : -10) : 0
  const oy = (pose === 'cast' ? -4 : 0) + bob
  const scale = actor.boss ? 1.35 : 1
  ctx.save()
  ctx.fillStyle = 'rgba(26,18,14,0.45)'
  const rx = actor.boss ? 14 : 10
  for (let py = -3; py <= 3; py++) {
    for (let px = -rx; px <= rx; px++) {
      if ((px * px) / (rx * rx) + (py * py) / 9 <= 1) ctx.fillRect(spot.x + px, spot.y + py, 1, 1)
    }
  }
  if (pose === 'down') {
    ctx.translate(spot.x, spot.y)
    ctx.scale(1, 0.58)
    ctx.translate(-spot.x, -spot.y)
    ctx.filter = 'brightness(0.42)'
  }
  const frame = Math.floor(time * 3 + actor.slot) & 1
  drawSprite(ctx, actor.sprite, spot.x + ox, spot.y + oy, {
    side: true,
    flip: !ally,
    scale,
    frame,
    dir: 'right',
    flash: pose === 'hurt' || actor.flash > 0,
  })
  ctx.restore()
  hpBar(ctx, spot.x, spot.y, actor.hpRatio)
  if (actor.charging) chargeMark(ctx, spot.x, spot.y - Math.round(liftOf(actor.sprite, actor.boss) * 0.72), time)
}

function paintFx(ctx: CanvasRenderingContext2D, element: Element, raw: number, time: number): void {
  const t = Math.max(0, Math.min(1, raw))
  const focusX = element === 'heal' ? 130 : 330
  const focusY = element === 'heal' ? 150 : 112
  if (element === 'fire') {
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.75
    ring(ctx, focusX, focusY + 15, 8 + t * 40, 4 + t * 16, '#f2d15a')
    ring(ctx, focusX, focusY + 15, 4 + t * 29, 2 + t * 10, '#e07a32')
    ctx.restore()
    for (let i = 0; i < 20; i++) {
      const life = (t * 1.2 + i * 0.07) % 1
      const x = focusX + Math.sin(i * 2.1) * (10 + life * 36)
      const y = focusY + 20 - life * 78 + Math.cos(i) * 6
      ctx.save()
      ctx.globalAlpha = 1 - life * 0.85
      blot(ctx, x, y, i % 3 === 0 ? 3 : 2, i % 2 === 0 ? 3 : 2, i % 2 ? '#e07a32' : '#f2d15a')
      ctx.restore()
    }
    return
  }
  if (element === 'ice') {
    ctx.save()
    ctx.globalAlpha = 0.75 * (1 - t)
    for (let i = 0; i < 5; i++) {
      const x = focusX - 32 + i * 16
      const h = 12 + (i % 3) * 7
      line(ctx, x - 5, focusY + 24, x, focusY + 24 - h, '#d5ecf2')
      line(ctx, x, focusY + 24 - h, x + 5, focusY + 24, '#7eb4d8')
    }
    ctx.restore()
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + t
      const dist = 8 + t * 48
      const x = focusX + Math.cos(a) * dist
      const y = focusY + Math.sin(a) * dist * 0.6
      line(ctx, x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 8, i % 2 ? '#d5ecf2' : '#7eb4d8')
      blot(ctx, x, y, 2, 2, '#ffffff')
    }
    return
  }
  if (element === 'volt') {
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.75
    ring(ctx, focusX, focusY, 4 + t * 31, 3 + t * 14, '#d7f7e5')
    ctx.restore()
    let x = 120
    let y = 150
    const bolts = 8
    for (let i = 1; i <= bolts; i++) {
      const nt = i / bolts
      const nx = 120 + (focusX - 120) * nt
      const ny = 150 + (focusY - 150) * nt + Math.sin(i * 3 + time * 20) * (i % 2 ? 10 : -12) * (1 - Math.abs(t - 0.5))
      line(ctx, x, y, nx, ny, '#7ec8c3')
      line(ctx, x, y + 1, nx, ny + 1, '#f4f7c8')
      x = nx
      y = ny
    }
    ctx.save()
    ctx.globalAlpha = 0.8
    blot(ctx, focusX - 2, focusY - 2, 4, 4, '#ffffff')
    ctx.restore()
    return
  }
  if (element === 'shadow') {
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.7
    ring(ctx, focusX, focusY + 15, 10 + t * 26, 5 + t * 9, '#9b76bd')
    ctx.restore()
    for (let i = 0; i < 8; i++) {
      const a = time * 2 + i
      const x = focusX + Math.cos(a) * (12 + t * 30)
      const y = focusY + Math.sin(a * 1.3) * (8 + t * 16)
      ctx.save()
      ctx.globalAlpha = 0.45 * (1 - t * 0.4)
      blot(ctx, x, y, 6, 4, '#241c33')
      blot(ctx, x + 1, y + 1, 3, 2, '#6d4ea3')
      ctx.restore()
    }
    return
  }
  if (element === 'heal') {
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.8
    ring(ctx, focusX, focusY + 15, 9 + t * 31, 4 + t * 12, '#b6e38a')
    line(ctx, focusX - 4, focusY - 9, focusX + 4, focusY - 9, '#f4f7c8')
    line(ctx, focusX, focusY - 13, focusX, focusY - 5, '#f4f7c8')
    ctx.restore()
    for (let i = 0; i < 16; i++) {
      const life = (t + i * 0.08) % 1
      const x = focusX + Math.sin(i * 1.7) * 28
      const y = focusY + 10 - life * 70
      ctx.save()
      ctx.globalAlpha = 1 - life
      blot(ctx, x, y, 2, 2, i % 2 ? '#b6e38a' : '#d7c07a')
      ctx.restore()
    }
    return
  }
  if (element === 'phys') {
    ctx.save()
    ctx.globalAlpha = 1 - t * 0.8
    line(ctx, focusX - 30 + t * 15, focusY + 22, focusX + 20 + t * 15, focusY - 22, '#fff8ee')
    line(ctx, focusX - 26 + t * 15, focusY + 23, focusX + 24 + t * 15, focusY - 21, '#d7c07a')
    ctx.restore()
    for (let i = 0; i < 5; i++) {
      const sweep = t * Math.PI + i * 0.4
      for (let s = 0; s < 10; s++) {
        const a = sweep + s * 0.12
        const rad = 10 + i * 6 + s
        dot(ctx, focusX + Math.cos(a) * rad, focusY + Math.sin(a) * rad * 0.55, s % 2 ? '#ffffff' : '#d8d3c8')
      }
    }
    return
  }
  const rings = 3
  for (let i = 0; i < rings; i++) {
    const p = Math.max(0, t - i * 0.12)
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - p)
    ring(ctx, 240, 120, 12 + p * 70, 8 + p * 36, i % 2 ? '#d7c07a' : '#efe6d0')
    ctx.restore()
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const rad = 16 + t * 54
    line(ctx, 240 + Math.cos(a) * rad, 120 + Math.sin(a) * rad * 0.6, 240 + Math.cos(a) * (rad + 6), 120 + Math.sin(a) * (rad + 6) * 0.6, '#d7c07a')
  }
}

export function drawBattle(
  ctx: CanvasRenderingContext2D,
  opts: {
    era: Era
    time: number
    allies: BattleDrawActor[]
    enemies: BattleDrawActor[]
    effect: null | { element: Element; t: number; name: string }
    shake: number
  },
): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  const mag = Math.max(0, Math.min(6, opts.shake))
  if (mag > 0) {
    const sx = Math.round(Math.sin(opts.time * 53) * mag)
    const sy = Math.round(Math.cos(opts.time * 47) * mag * 0.65)
    ctx.translate(sx, sy)
  }
  paintBackdrop(ctx, opts.era, opts.time)
  paintBattleDetails(ctx, opts.era, opts.time)
  const foes = opts.enemies.slice().sort((a, b) => a.slot - b.slot)
  const friends = opts.allies.slice().sort((a, b) => a.slot - b.slot)
  for (const actor of foes) drawFighter(ctx, actor, false, opts.time)
  for (const actor of friends) drawFighter(ctx, actor, true, opts.time)
  if (opts.effect) paintFx(ctx, opts.effect.element, opts.effect.t, opts.time)
  ctx.restore()
  ctx.imageSmoothingEnabled = false
}
