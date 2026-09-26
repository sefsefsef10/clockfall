import { VIEW_H, VIEW_W } from '../const.ts'

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

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, step = 3): void {
  for (let deg = 0; deg < 360; deg += step) {
    const a = (deg * Math.PI) / 180
    dot(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, color)
  }
}

function tri(ctx: CanvasRenderingContext2D, apexX: number, apexY: number, base: number, height: number, color: string): void {
  ctx.fillStyle = color
  for (let i = 0; i < height; i++) {
    const w = Math.max(1, Math.round((base * i) / Math.max(1, height)))
    ctx.fillRect(Math.round(apexX - w / 2), Math.round(apexY + i), w, 1)
  }
}

function bands(ctx: CanvasRenderingContext2D, colors: readonly string[], y0: number, y1: number): void {
  const span = Math.max(1, y1 - y0)
  for (let i = 0; i < colors.length; i++) {
    const y = y0 + Math.floor((i * span) / colors.length)
    const next = y0 + Math.floor(((i + 1) * span) / colors.length)
    const color = colors[i]
    if (color) blot(ctx, 0, y, VIEW_W, Math.max(1, next - y), color)
  }
}

function clock(ctx: CanvasRenderingContext2D, time: number, smooth: boolean, warm: boolean): void {
  const cx = 240
  const cy = 132
  const gold = warm ? '#f0d090' : '#d7c07a'
  const goldD = warm ? '#c49a58' : '#a89050'
  const face = warm ? '#f6e7c8' : '#efe6d0'
  ring(ctx, cx, cy, 92, goldD, 2)
  ring(ctx, cx, cy, 88, gold, 2)
  ring(ctx, cx, cy, 84, warm ? '#8c5a22' : '#6b4a2e', 3)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    const inner = i % 3 === 0 ? 74 : 80
    line(ctx, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * 86, cy + Math.sin(a) * 86, i % 3 === 0 ? gold : face)
  }
  const minute = smooth ? time * 0.45 : Math.floor(time * 2) * 0.225
  const hour = minute / 12
  const hand = (angle: number, len: number, color: string, thick: number) => {
    const x1 = cx + Math.cos(angle) * len
    const y1 = cy + Math.sin(angle) * len
    line(ctx, cx, cy, x1, y1, color)
    if (thick > 1) line(ctx, cx + 1, cy, x1 + 1, y1, color)
  }
  hand(hour - Math.PI / 2, 40, '#1a120e', 2)
  hand(minute - Math.PI / 2, 64, warm ? '#c23b2e' : '#8e241c', 1)
  blot(ctx, cx - 2, cy - 2, 4, 4, gold)
  blot(ctx, cx - 1, cy - 1, 2, 2, '#1a120e')
}

function gear(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, time: number, color: string): void {
  ring(ctx, cx, cy, radius, color, 5)
  ring(ctx, cx, cy, radius - 5, color, 7)
  ring(ctx, cx, cy, 4, color, 9)
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + time
    const x0 = cx + Math.cos(a) * (radius - 5)
    const y0 = cy + Math.sin(a) * (radius - 5)
    const x1 = cx + Math.cos(a) * (radius + 6)
    const y1 = cy + Math.sin(a) * (radius + 6)
    line(ctx, x0, y0, x1, y1, color)
  }
}

function timeline(ctx: CanvasRenderingContext2D, time: number, ending: boolean): void {
  const warm = ending ? '#f6e2b8' : '#d7c07a'
  const cool = ending ? '#b4e3da' : '#7ec8c3'
  ctx.save()
  ctx.globalAlpha = ending ? 0.48 : 0.35
  gear(ctx, 109, 135, 43, -time * 0.06, warm)
  gear(ctx, 370, 136, 48, time * 0.05, cool)
  line(ctx, 0, 90, 480, 180, warm)
  line(ctx, 0, 180, 480, 90, cool)
  line(ctx, 0, 88, 480, 178, warm)
  line(ctx, 0, 182, 480, 92, cool)
  ctx.restore()
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9 + time * 0.15
    const x = 240 + Math.cos(a) * 110
    const y = 132 + Math.sin(a) * 104
    dot(ctx, x, y, i % 2 ? cool : warm)
    if (i % 3 === 0) {
      dot(ctx, x - 1, y, warm)
      dot(ctx, x + 1, y, warm)
    }
  }
}

function motes(ctx: CanvasRenderingContext2D, time: number, avoidCenter: boolean): void {
  const colors = ['#f2d15a', '#7ec8c3', '#efe6d0', '#e07aa0', '#d7c07a']
  for (let i = 0; i < 28; i++) {
    const speed = 10 + (i % 5) * 6
    const x = (i * 37 + Math.floor(time * speed)) % VIEW_W
    const y = (i * 53 + Math.floor(time * (8 + (i % 4)))) % VIEW_H
    if (avoidCenter && x > 150 && x < 330 && y > 96 && y < 176) continue
    const color = colors[i % colors.length] ?? '#efe6d0'
    dot(ctx, x, y, color)
    if (i % 4 === 0) dot(ctx, x + 1, y, color)
  }
}

function fairBand(ctx: CanvasRenderingContext2D, bright: boolean): void {
  const sky = bright
    ? ['#f6e2b8', '#f0c48a', '#87b8d4', '#5e97c4']
    : ['#e2c49a', '#c9a27a', '#6e97b0', '#4d7594']
  bands(ctx, sky, 0, 90)
  tri(ctx, 48, 48, 54, 36, bright ? '#3e8a4a' : '#2f5a34')
  tri(ctx, 96, 58, 36, 24, bright ? '#6ea84a' : '#4e7c34')
  tri(ctx, 430, 46, 60, 40, bright ? '#2a5424' : '#1e3c1c')
  blot(ctx, 18, 70, 16, 12, bright ? '#efe6d0' : '#d3c6a4')
  tri(ctx, 26, 56, 20, 14, '#8c3d32')
  blot(ctx, 400, 22, 14, 14, bright ? '#f2d15a' : '#c9a24a')
}

function ashBand(ctx: CanvasRenderingContext2D, y0: number, y1: number, bright: boolean): void {
  bands(ctx, bright ? ['#8a8174', '#6d645c', '#5c4636'] : ['#3a342f', '#2a241f', '#1a1614'], y0, y1)
  blot(ctx, 16, y0 + 10, 18, y1 - y0 - 20, bright ? '#a24b32' : '#4a3028')
  blot(ctx, 446, y0 + 6, 22, y1 - y0 - 16, bright ? '#8aa0a8' : '#3e4a50')
  blot(ctx, 450, y0 + 16, 6, 10, bright ? '#7ec8c3' : '#3e6a66')
  blot(ctx, 8, y0 + 18, 10, 8, '#2e2926')
}

function stoneBand(ctx: CanvasRenderingContext2D, bright: boolean): void {
  const y0 = 180
  bands(ctx, bright ? ['#c5c7d0', '#8d8f99', '#6e7080'] : ['#5c5e68', '#3a3c44', '#2a2830'], y0, VIEW_H)
  for (let x = 0; x < VIEW_W; x += 16) {
    blot(ctx, x, y0 + 8, 15, 1, bright ? '#d7c07a' : '#6e5a40')
    blot(ctx, x, y0 + 40, 15, 1, '#5c5e68')
  }
  blot(ctx, 0, y0 + 20, VIEW_W, 16, bright ? '#7a2e3b' : '#541f28')
  blot(ctx, 0, y0 + 20, VIEW_W, 1, '#d7c07a')
  blot(ctx, 0, y0 + 35, VIEW_W, 1, '#d7c07a')
  blot(ctx, 24, y0, 14, 28, bright ? '#c5c7d0' : '#6e7080')
  blot(ctx, 442, y0, 14, 28, bright ? '#c5c7d0' : '#6e7080')
}

function centerShade(ctx: CanvasRenderingContext2D, alpha: number): void {
  ctx.save()
  ctx.globalAlpha = alpha
  for (let y = 92; y <= 178; y++) {
    const t = Math.abs(y - 135) / 43
    const half = Math.round(150 * (1 - t * t * 0.35))
    blot(ctx, 240 - half, y, half * 2, 1, '#120e12')
  }
  ctx.restore()
}

function paintScene(ctx: CanvasRenderingContext2D, time: number, ending: boolean, page: number): void {
  ctx.imageSmoothingEnabled = false
  const band = ((page % 3) + 3) % 3
  fairBand(ctx, ending && band === 0)
  ashBand(ctx, 90, 180, ending && band === 1)
  stoneBand(ctx, ending && band === 2)
  timeline(ctx, time, ending)
  clock(ctx, time, ending, ending)
  centerShade(ctx, ending ? 0.42 : 0.62)
  if (ending) {
    ctx.save()
    ctx.globalAlpha = 0.16
    blot(ctx, 0, 0, VIEW_W, VIEW_H, '#f0c48a')
    ctx.globalAlpha = 0.22
    if (band === 0) blot(ctx, 0, 0, VIEW_W, 90, '#f6e2b8')
    else if (band === 1) blot(ctx, 0, 90, VIEW_W, 90, '#e7c39a')
    else blot(ctx, 0, 180, VIEW_W, 90, '#f0d7b0')
    ctx.restore()
  }
  motes(ctx, time, !ending)
  ctx.imageSmoothingEnabled = false
}

export function drawTitle(ctx: CanvasRenderingContext2D, time: number): void {
  paintScene(ctx, time, false, 1)
}

export function drawEnding(ctx: CanvasRenderingContext2D, time: number, page: number): void {
  paintScene(ctx, time, true, page)
}
