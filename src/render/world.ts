import type { ActorDraw, Era, GameMap } from '../types.ts'
import { TILE, VIEW_H, VIEW_W } from '../const.ts'
import { drawSprite } from './sprites.ts'

interface Pal {
  grass: string
  grassD: string
  grassL: string
  dirt: string
  dirtD: string
  cobble: string
  cobbleD: string
  water: string
  waterD: string
  foam: string
  roof: string
  roofD: string
  wall: string
  wallD: string
  wood: string
  woodD: string
  leaf: string
  leafD: string
  trunk: string
  flowerA: string
  flowerB: string
  flowerC: string
  stone: string
  stoneD: string
  carpet: string
  carpetD: string
  metal: string
  metalD: string
  ash: string
  rust: string
  energy: string
  gold: string
  base: string
  crack: string
}

const PRESENT: Pal = {
  grass: '#6ea84a', grassD: '#4e7c34', grassL: '#8fbf5e',
  dirt: '#cbb892', dirtD: '#a89068',
  cobble: '#b7a48a', cobbleD: '#8d7b62',
  water: '#3f7f9a', waterD: '#2c5e74', foam: '#d5ecf2',
  roof: '#8c3d32', roofD: '#6a2c24',
  wall: '#efe6d0', wallD: '#d3c6a4',
  wood: '#a87548', woodD: '#6b4a2e',
  leaf: '#3f7a32', leafD: '#2a5424',
  trunk: '#6b4a2e',
  flowerA: '#e07aa0', flowerB: '#f2d15a', flowerC: '#f4f0e6',
  stone: '#c8c2b4', stoneD: '#8d8f99',
  carpet: '#7a2e3b', carpetD: '#541f28',
  metal: '#8aa0a8', metalD: '#5e7278',
  ash: '#6d645c', rust: '#a24b32', energy: '#7ec8c3', gold: '#d7c07a',
  base: '#4e7c34', crack: '#d7c07a',
}

const FUTURE: Pal = {
  grass: '#7a7568', grassD: '#5c5950', grassL: '#8d887c',
  dirt: '#8a8174', dirtD: '#6d645c',
  cobble: '#7d7870', cobbleD: '#5a554e',
  water: '#5e7e86', waterD: '#3e555c', foam: '#c5d4d4',
  roof: '#a24b32', roofD: '#6e3024',
  wall: '#a39b92', wallD: '#6d645c',
  wood: '#7a5a42', woodD: '#4a372c',
  leaf: '#6d645c', leafD: '#4a433c',
  trunk: '#5c4636',
  flowerA: '#a24b32', flowerB: '#c4b48a', flowerC: '#8aa0a8',
  stone: '#8aa0a8', stoneD: '#5e7278',
  carpet: '#6e3a34', carpetD: '#4a2824',
  metal: '#8aa0a8', metalD: '#5e7278',
  ash: '#6d645c', rust: '#a24b32', energy: '#7ec8c3', gold: '#d7c07a',
  base: '#4a433c', crack: '#a24b32',
}

const PAST: Pal = {
  grass: '#8d8f99', grassD: '#6e7080', grassL: '#b7b9c4',
  dirt: '#9a9088', dirtD: '#6e6860',
  cobble: '#a8a6b0', cobbleD: '#6e7080',
  water: '#6a7e99', waterD: '#46566e', foam: '#d5dceb',
  roof: '#6e5a68', roofD: '#4a3c48',
  wall: '#c5c7d0', wallD: '#8d8f99',
  wood: '#8a7568', woodD: '#5c4a40',
  leaf: '#6e7080', leafD: '#4e5260',
  trunk: '#5c4a40',
  flowerA: '#7a2e3b', flowerB: '#d7c07a', flowerC: '#efe6d0',
  stone: '#8d8f99', stoneD: '#5c5e68',
  carpet: '#7a2e3b', carpetD: '#541f28',
  metal: '#b7b4aa', metalD: '#6e6c74',
  ash: '#8d8f99', rust: '#7a2e3b', energy: '#d7c07a', gold: '#d7c07a',
  base: '#6e7080', crack: '#d7c07a',
}

const VOID: Pal = {
  grass: '#24233a', grassD: '#1b1a33', grassL: '#3a3858',
  dirt: '#2a2840', dirtD: '#1b1a33',
  cobble: '#32304a', cobbleD: '#1b1a33',
  water: '#2a3a55', waterD: '#1b1a33', foam: '#d7c07a',
  roof: '#3a3058', roofD: '#241c33',
  wall: '#2e2c48', wallD: '#1b1a33',
  wood: '#3a3050', woodD: '#241830',
  leaf: '#2a2848', leafD: '#1b1a33',
  trunk: '#3a3050',
  flowerA: '#d7c07a', flowerB: '#7ec8c3', flowerC: '#efe6d0',
  stone: '#32304a', stoneD: '#1b1a33',
  carpet: '#3a2040', carpetD: '#1b1a33',
  metal: '#8aa0a8', metalD: '#3a3858',
  ash: '#2a2840', rust: '#a24b32', energy: '#7ec8c3', gold: '#d7c07a',
  base: '#1b1a33', crack: '#d7c07a',
}

function palette(era: Era): Pal {
  switch (era) {
    case 'present': return PRESENT
    case 'future': return FUTURE
    case 'past': return PAST
    case 'void': return VOID
    default: {
      const leftover: never = era
      void leftover
      return VOID
    }
  }
}

function hash(x: number, y: number): number {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return (n ^ (n >>> 16)) >>> 0
}

function tileAt(map: GameMap, x: number, y: number): string {
  if (y < 0 || y >= map.rows.length) return ' '
  const row = map.rows[y] ?? ''
  if (x < 0 || x >= row.length) return ' '
  return row[x] ?? ' '
}

function blot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
}

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  if (rx <= 0 || ry <= 0) return
  const x0 = Math.floor(cx - rx)
  const y0 = Math.floor(cy - ry)
  const x1 = Math.ceil(cx + rx)
  const y1 = Math.ceil(cy + ry)
  ctx.fillStyle = color
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1)
    }
  }
}

function cracks(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, color: string): void {
  const h = hash(tx, ty)
  if (h % 3 !== 0) return
  const x = sx + (h % 10) + 2
  const y = sy + ((h >>> 4) % 10) + 2
  dot(ctx, x, y, color)
  dot(ctx, x + 1, y, color)
  dot(ctx, x + 2, y + 1, color)
  dot(ctx, x + 2, y + 2, color)
}

function grass(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  const h = hash(tx, ty)
  blot(ctx, sx, sy, TILE, TILE, h % 5 === 0 ? pal.grassD : pal.grass)
  for (let i = 0; i < 6; i++) {
    const n = hash(tx + i * 3, ty + i * 5)
    const x = sx + (n % 14) + 1
    const y = sy + ((n >>> 3) % 14) + 1
    dot(ctx, x, y, i % 2 === 0 ? pal.grassL : pal.grassD)
    if (i % 3 === 0) blot(ctx, x, y, 1, 2, pal.grassD)
  }
}

function flowers(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  grass(ctx, sx, sy, tx, ty, pal)
  const colors = [pal.flowerA, pal.flowerB, pal.flowerC]
  for (let i = 0; i < 3; i++) {
    const n = hash(tx + 11 + i, ty + 4)
    const x = sx + (n % 12) + 2
    const y = sy + ((n >>> 4) % 10) + 3
    const c = colors[i % colors.length] ?? pal.flowerA
    dot(ctx, x, y, c)
    dot(ctx, x + 1, y, c)
    dot(ctx, x, y + 1, pal.grassD)
  }
}

function dirt(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.dirt)
  blot(ctx, sx, sy + 14, TILE, 2, pal.dirtD)
  const h = hash(tx, ty)
  for (let i = 0; i < 4; i++) {
    const n = hash(tx + i, ty + 9)
    dot(ctx, sx + (n % 13) + 1, sy + ((n >>> 2) % 12) + 2, i % 2 ? pal.dirtD : pal.cobble)
  }
  if (h % 4 === 0) blot(ctx, sx + 4, sy + 6, 3, 1, pal.dirtD)
}

function cobble(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.cobbleD)
  const shift = hash(tx, ty) % 3
  for (let row = 0; row < 4; row++) {
    const off = (row + shift) % 2 === 0 ? 0 : 4
    for (let col = 0; col < 3; col++) {
      const x = sx + off + col * 6
      const y = sy + row * 4
      blot(ctx, x + 1, y + 1, 4, 2, (row + col) % 2 === 0 ? pal.cobble : pal.stone)
    }
  }
}

function water(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal, time: number): void {
  blot(ctx, sx, sy, TILE, TILE, pal.waterD)
  blot(ctx, sx, sy, TILE, TILE, pal.water)
  const phase = Math.floor(time * 4 + (hash(tx, ty) % 4)) % 8
  for (let row = 0; row < 4; row++) {
    const y = sy + ((row * 4 + phase) % 16)
    blot(ctx, sx, y, TILE, 1, row % 2 === 0 ? pal.waterD : pal.foam)
    const n = hash(tx, ty + row)
    dot(ctx, sx + (n % 12) + 2, y, pal.foam)
  }
}

function bridge(ctx: CanvasRenderingContext2D, sx: number, sy: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.waterD)
  blot(ctx, sx + 1, sy, 14, TILE, pal.wood)
  for (let i = 0; i < 4; i++) blot(ctx, sx + 1, sy + 2 + i * 4, 14, 1, pal.woodD)
  blot(ctx, sx, sy, 2, TILE, pal.woodD)
  blot(ctx, sx + 14, sy, 2, TILE, pal.woodD)
  dot(ctx, sx + 1, sy + 4, pal.gold)
  dot(ctx, sx + 14, sy + 11, pal.gold)
}

function doorway(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.stoneD)
  blot(ctx, sx, sy + 6, TILE, 6, pal.stone)
  blot(ctx, sx, sy + 6, TILE, 2, pal.wall)
  blot(ctx, sx + 2, sy + 10, 12, 2, pal.stoneD)
  if (hash(tx, ty) % 2 === 0) blot(ctx, sx + 6, sy + 8, 4, 2, pal.carpet)
}

function fence(ctx: CanvasRenderingContext2D, sx: number, sy: number, pal: Pal): void {
  grass(ctx, sx, sy, sx, sy, pal)
  blot(ctx, sx + 2, sy + 4, 2, 12, pal.woodD)
  blot(ctx, sx + 12, sy + 4, 2.2, 12, pal.wood)
  blot(ctx, sx + 2, sy + 6, 12, 2.2, pal.wood)
  blot(ctx, sx + 2, sy + 11, 12, 1, pal.woodD)
}

function brush(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  grass(ctx, sx, sy, tx, ty, pal)
  const blades: Array<[number, number, number]> = [[2, 4, 10], [5, 2, 12], [8, 5, 9], [11, 1, 13], [13, 6, 8]]
  for (const [x, top, h] of blades) {
    const n = hash(tx + x, ty)
    blot(ctx, sx + x, sy + top, 1, h - top, n % 2 ? pal.leaf : pal.grassD)
    dot(ctx, sx + x, sy + top, pal.grassL)
  }
}

function ash(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.ash)
  for (let i = 0; i < 7; i++) {
    const n = hash(tx + i * 2, ty + 3)
    dot(ctx, sx + (n % 14) + 1, sy + ((n >>> 3) % 14) + 1, i % 3 === 0 ? pal.rust : pal.stoneD)
  }
  if (hash(tx, ty) % 5 === 0) dot(ctx, sx + 8, sy + 7, pal.energy)
}

function metal(ctx: CanvasRenderingContext2D, sx: number, sy: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.metalD)
  blot(ctx, sx + 1, sy + 1, 14, 14, pal.metal)
  blot(ctx, sx + 1, sy + 1, 14, 1, '#d5dee2')
  blot(ctx, sx + 1, sy + 14, 14, 1, pal.metalD)
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]] as const) {
    dot(ctx, sx + x, sy + y, pal.gold)
    dot(ctx, sx + x + 1, sy + y, pal.metalD)
  }
  blot(ctx, sx + 7, sy + 7, 2, 2, pal.energy)
}

function rubble(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.dirtD)
  const h = hash(tx, ty)
  blot(ctx, sx + 2, sy + 8, 5, 4, pal.stone)
  blot(ctx, sx + 8, sy + 5, 6, 5, pal.stoneD)
  blot(ctx, sx + 4, sy + 3, 3, 3, h % 2 ? pal.rust : pal.cobble)
  dot(ctx, sx + 9, sy + 6, pal.wall)
  dot(ctx, sx + 3, sy + 12, pal.ash)
}

function stoneFloor(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.stoneD)
  const shift = hash(tx, ty) % 2
  blot(ctx, sx + 1, sy + 1, 7, 6, pal.stone)
  blot(ctx, sx + 9, sy + 1, 6, 6, shift ? pal.wall : pal.stone)
  blot(ctx, sx + 1, sy + 9, 6, 6, pal.cobble)
  blot(ctx, sx + 8, sy + 9, 7, 6, pal.stone)
  dot(ctx, sx + 4, sy + 4, pal.stoneD)
}

function carpet(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.carpetD)
  blot(ctx, sx + 1, sy + 1, 14, 14, pal.carpet)
  blot(ctx, sx + 1, sy + 1, 14, 1, pal.gold)
  blot(ctx, sx + 1, sy + 14, 14, 1, pal.gold)
  blot(ctx, sx + 1, sy + 1, 1, 14, pal.gold)
  blot(ctx, sx + 14, sy + 1, 1, 14, pal.gold)
  const cx = sx + 7 + (hash(tx, ty) % 2)
  const cy = sy + 7
  dot(ctx, cx, cy, pal.gold)
  dot(ctx, cx + 1, cy + 1, pal.gold)
  dot(ctx, cx - 1, cy + 1, pal.gold)
  dot(ctx, cx, cy + 2, pal.gold)
}

function stairs(ctx: CanvasRenderingContext2D, sx: number, sy: number, pal: Pal): void {
  blot(ctx, sx, sy, TILE, TILE, pal.stoneD)
  for (let i = 0; i < 4; i++) {
    const y = sy + i * 4
    blot(ctx, sx, y, TILE, 4, i % 2 ? pal.stone : pal.wall)
    blot(ctx, sx, y, TILE, 1, pal.wall)
    blot(ctx, sx, y + 3, TILE, 1, pal.stoneD)
  }
}

function crystal(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal, time: number): void {
  grass(ctx, sx, sy, tx, ty, pal)
  const glint = Math.floor(time * 5 + (hash(tx, ty) % 4)) % 4
  blot(ctx, sx + 7, sy + 12, 2, 3, pal.stoneD)
  const cx = sx + 8
  const cy = sy + 7
  for (let row = -5; row <= 5; row++) {
    const half = row < 0 ? 5 + row : 5 - row
    blot(ctx, cx - half, cy + row, half * 2 + 1, 1, Math.abs(row) > 3 ? pal.energy : '#d8fff8')
  }
  blot(ctx, cx - 1, cy - 1, 2, 3, pal.gold)
  const gx = cx - 2 + glint
  dot(ctx, gx, cy - 3, '#ffffff')
}

function gate(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal, time: number): void {
  const base = pal.base
  blot(ctx, sx, sy, TILE, TILE, base)
  const cx = sx + 8
  const cy = sy + 8
  for (let deg = 0; deg < 360; deg += 12) {
    const a = (deg * Math.PI) / 180
    dot(ctx, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, pal.stone)
    dot(ctx, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, pal.gold)
  }
  const spin = time * 3 + (hash(tx, ty) % 5)
  dot(ctx, cx + Math.cos(spin) * 2.5, cy + Math.sin(spin) * 2.5, pal.energy)
  dot(ctx, cx + Math.cos(spin + 2) * 2.5, cy + Math.sin(spin + 2) * 2.5, '#ffffff')
  blob(ctx, cx, cy, 2.2, 2.2, pal.energy)
}

function pillar(ctx: CanvasRenderingContext2D, sx: number, sy: number, pal: Pal): void {
  blot(ctx, sx, sy + 12, TILE, 4, pal.stoneD)
  blot(ctx, sx + 4, sy - 2, 8, 14, pal.stone)
  blot(ctx, sx + 4, sy - 2, 2, 14, pal.stoneD)
  blot(ctx, sx + 3, sy - 4, 10, 3, pal.wall)
  blot(ctx, sx + 5, sy - 5, 6, 2, pal.stoneD)
  blot(ctx, sx + 6, sy + 2, 2.2, 6, pal.wall)
}

function rock(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  grass(ctx, sx, sy, tx, ty, pal)
  blob(ctx, sx + 8, sy + 10, 6, 4, pal.stoneD)
  blob(ctx, sx + 7, sy + 9, 5, 3.2, pal.stone)
  dot(ctx, sx + 5, sy + 8, pal.wall)
  if (hash(tx, ty) % 2 === 0) blob(ctx, sx + 11, sy + 11, 2, 1.4, pal.cobbleD)
}

function tree(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal): void {
  grass(ctx, sx, sy, tx, ty, pal)
  blot(ctx, sx + 6, sy + 8, 4, 8, pal.trunk)
  blot(ctx, sx + 7, sy + 8, 1, 7, pal.wood)
  const h = hash(tx, ty)
  blob(ctx, sx + 8, sy + 5, 7, 6, pal.leafD)
  blob(ctx, sx + 7, sy + 4, 5, 4, h % 2 ? pal.leaf : pal.grass)
  blob(ctx, sx + 5, sy + 3, 2.4, 2, pal.grassL)
  dot(ctx, sx + 4, sy + 2, pal.leafD)
}

function wall(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number, pal: Pal, above: string): void {
  const lip = above !== '#'
  if (lip) {
    blot(ctx, sx, sy, TILE, 6, pal.roof)
    blot(ctx, sx, sy, TILE, 2, pal.roofD)
    blot(ctx, sx, sy + 5, TILE, 2, pal.roofD)
    blot(ctx, sx, sy + 7, TILE, 9, pal.wall)
    blot(ctx, sx, sy + 7, TILE, 1, pal.wallD)
  } else {
    blot(ctx, sx, sy, TILE, TILE, pal.wall)
    blot(ctx, sx, sy + 4, TILE, 1, pal.wallD)
    blot(ctx, sx, sy + 10, TILE, 1, pal.wallD)
    blot(ctx, sx + 8, sy, 1, 4, pal.wallD)
    blot(ctx, sx + 3, sy + 5, 1, 5, pal.wallD)
  }
  if (hash(tx, ty) % 7 === 0 && !lip) {
    blot(ctx, sx + 5, sy + 6, 4, 3, pal.roofD)
    dot(ctx, sx + 6, sy + 7, pal.gold)
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  pal: Pal,
  era: Era,
  time: number,
  above: string,
): void {
  switch (ch) {
    case '.': grass(ctx, sx, sy, tx, ty, pal); break
    case 'f': flowers(ctx, sx, sy, tx, ty, pal); break
    case 'p': dirt(ctx, sx, sy, tx, ty, pal); break
    case ',': cobble(ctx, sx, sy, tx, ty, pal); break
    case 'w': water(ctx, sx, sy, tx, ty, pal, time); break
    case 'b': bridge(ctx, sx, sy, pal); break
    case 'd': doorway(ctx, sx, sy, tx, ty, pal); break
    case '=': fence(ctx, sx, sy, pal); break
    case '~': brush(ctx, sx, sy, tx, ty, pal); break
    case 'a': ash(ctx, sx, sy, tx, ty, pal); break
    case 'm': metal(ctx, sx, sy, pal); break
    case 'r': rubble(ctx, sx, sy, tx, ty, pal); break
    case 's': stoneFloor(ctx, sx, sy, tx, ty, pal); break
    case 'c': carpet(ctx, sx, sy, tx, ty, pal); break
    case '^': stairs(ctx, sx, sy, pal); break
    case 'k': crystal(ctx, sx, sy, tx, ty, pal, time); break
    case 'g': gate(ctx, sx, sy, tx, ty, pal, time); break
    case '|': pillar(ctx, sx, sy, pal); break
    case 'o': rock(ctx, sx, sy, tx, ty, pal); break
    case 't': tree(ctx, sx, sy, tx, ty, pal); break
    case '#': wall(ctx, sx, sy, tx, ty, pal, above); break
    default:
      blot(ctx, sx, sy, TILE, TILE, '#ff00ff')
      break
  }
  if (era === 'void' && ch !== ' ' && ch !== 'w') cracks(ctx, sx, sy, tx, ty, pal.crack)
}

/** Small landmarks are tied to tile coordinates, so camera movement never shuffles them. */
function eraDetail(ctx: CanvasRenderingContext2D, ch: string, sx: number, sy: number, tx: number, ty: number, era: Era, time: number, pal: Pal): void {
  const seed = hash(tx, ty)
  if (era === 'present') {
    if ((ch === '.' || ch === 'f' || ch === '~') && seed % 9 === 0) {
      const x = sx + 3 + (seed % 10)
      const y = sy + 4 + ((seed >>> 5) % 9)
      const lit = Math.sin(time * 3 + seed) > -0.1
      dot(ctx, x, y, lit ? '#fff2a8' : pal.flowerB)
      if (lit) {
        ctx.save()
        ctx.globalAlpha = 0.19
        blot(ctx, x - 2, y - 2, 5, 5, '#f2d15a')
        ctx.restore()
      }
    }
    if (ch === 't' && seed % 3 === 0) {
      dot(ctx, sx + 11, sy + 4, '#b5d57b')
      dot(ctx, sx + 5, sy + 7, '#d2e798')
    }
  } else if (era === 'future') {
    if ((ch === 'a' || ch === 'r' || ch === 'm') && seed % 4 === 0) {
      const pulse = Math.sin(time * 2 + seed) > 0.3
      blot(ctx, sx + 5, sy + 10, 3, 1, pulse ? '#a1e4d8' : '#496f72')
      dot(ctx, sx + 9, sy + 11, pal.rust)
    }
    if (ch === 'w') {
      const x = sx + ((Math.floor(time * 3) + seed) % 12) + 2
      blot(ctx, x, sy + 6, 3, 1, '#92bbc0')
    }
  } else if (era === 'past') {
    if ((ch === 's' || ch === 'c' || ch === '|') && seed % 7 === 0) {
      blot(ctx, sx + 3, sy + 3, 2, 1, '#ded3b5')
      dot(ctx, sx + 5, sy + 4, pal.gold)
    }
    if (ch === 'w') dot(ctx, sx + 8, sy + 6, '#c4cce0')
  } else if ((ch === '.' || ch === 's' || ch === 'a') && seed % 6 === 0) {
    const pulse = Math.sin(time * 2.5 + seed) > 0
    dot(ctx, sx + 4 + (seed % 8), sy + 5 + ((seed >>> 4) % 6), pulse ? '#f7e8b2' : '#645a73')
  }
  if (ch === 'k' || ch === 'g') {
    const pulse = 0.13 + (Math.sin(time * 3 + seed) + 1) * 0.08
    ctx.save()
    ctx.globalAlpha = pulse
    blot(ctx, sx + 1, sy + 1, 14, 14, ch === 'k' ? '#dcfff5' : pal.gold)
    ctx.restore()
  }
}

function weather(ctx: CanvasRenderingContext2D, era: Era, time: number): void {
  const count = era === 'present' ? 13 : era === 'future' ? 30 : 20
  const colors = era === 'present' ? ['#fff3bb', '#d8e7b5']
    : era === 'future' ? ['#c18b6a', '#a7a099']
      : era === 'past' ? ['#e7dfd2', '#d7c07a'] : ['#d7c07a', '#7ec8c3']
  ctx.save()
  ctx.globalAlpha = era === 'present' ? 0.65 : 0.36
  for (let i = 0; i < count; i++) {
    const speed = era === 'future' ? 8 + (i % 5) * 3 : 4 + (i % 4) * 2
    const drift = era === 'void' ? Math.sin(time * 0.8 + i) * 9 : time * (era === 'future' ? -3 : 2)
    const x = ((i * 79 + drift) % VIEW_W + VIEW_W) % VIEW_W
    const y = (i * 97 + time * speed) % VIEW_H
    const color = colors[i % colors.length] ?? '#d7c07a'
    dot(ctx, x, y, color)
    if (era === 'future' && i % 4 === 0) dot(ctx, x - 1, y - 1, color)
  }
  ctx.restore()
}

interface CausalityView {
  seed_heard?: boolean
  seed_planted?: boolean
  seed_seen?: boolean
  seed_claimed?: boolean
}

function temporalSeed(ctx: CanvasRenderingContext2D, map: GameMap, camX: number, camY: number, time: number, state?: CausalityView): void {
  if (map.id !== 'crownkeep' && map.id !== 'leorain' && map.id !== 'ashspire') return
  const sx = 8 * TILE - camX
  const sy = 16 * TILE - camY
  if (sx < -TILE || sx > VIEW_W || sy < -TILE * 2 || sy > VIEW_H + TILE) return
  const planted = state?.seed_planted === true
  const grown = planted && map.id !== 'crownkeep'
  const future = map.id === 'ashspire'
  // The same stone rim persists across the three ages.
  blot(ctx, sx + 2, sy + 11, 12, 3, future ? '#5e7278' : '#8d8f99')
  blot(ctx, sx + 3, sy + 10, 10, 2, future ? '#3d625a' : '#6b4a2e')
  dot(ctx, sx + 3, sy + 11, '#d7c07a')
  dot(ctx, sx + 12, sy + 11, '#d7c07a')
  if (grown) {
    const leaf = future ? '#82b99a' : '#3f7a32'
    const leafLight = future ? '#b8e3b5' : '#9dcf6d'
    blot(ctx, sx + 7, sy + 1, 2, 10, future ? '#716957' : '#6b4a2e')
    blob(ctx, sx + 8, sy + 1, 6, 5, future ? '#416f67' : '#2a5424')
    blob(ctx, sx + 7, sy - 1, 4, 3, leaf)
    dot(ctx, sx + 5, sy - 3, leafLight)
    dot(ctx, sx + 10, sy + 1, leafLight)
    if (future) {
      dot(ctx, sx + 6, sy + 9, '#7ec8c3')
      dot(ctx, sx + 11, sy + 7, '#7ec8c3')
      if (state?.seed_claimed) dot(ctx, sx + 8, sy - 4, '#fff2bd')
    } else if (state?.seed_seen) dot(ctx, sx + 8, sy - 5, '#fff2bd')
  } else if (planted) {
    blot(ctx, sx + 7, sy + 5, 2, 6, '#6e9b59')
    blot(ctx, sx + 5, sy + 4, 3, 2, '#a4c889')
    blot(ctx, sx + 9, sy + 3, 3, 2, '#8fbf5e')
    if (Math.sin(time * 2.5) > 0) dot(ctx, sx + 8, sy + 2, '#d7c07a')
  } else {
    blot(ctx, sx + 5, sy + 8, 6, 2, future ? '#6d645c' : '#8a7568')
    if (future && state?.seed_heard) dot(ctx, sx + 8, sy + 7, '#7ec8c3')
  }
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(26,18,14,0.4)'
  const rx = 5
  const ry = 2
  for (let py = -ry; py <= ry; py++) {
    for (let px = -rx; px <= rx; px++) {
      if ((px * px) / (rx * rx) + (py * py) / (ry * ry) <= 1) ctx.fillRect(x + px, y + py, 1, 1)
    }
  }
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  opts: {
    map: GameMap
    camera: { x: number; y: number }
    time: number
    actors: ActorDraw[]
    causality?: CausalityView
  },
): void {
  const { map, time, actors } = opts
  const camX = Math.round(opts.camera.x)
  const camY = Math.round(opts.camera.y)
  ctx.imageSmoothingEnabled = false
  const pal = palette(map.era)
  ctx.fillStyle = pal.base
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  const x0 = Math.floor(camX / TILE) - 1
  const y0 = Math.floor(camY / TILE) - 1
  const x1 = Math.floor((camX + VIEW_W) / TILE) + 1
  const y1 = Math.floor((camY + VIEW_H) / TILE) + 1
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = tileAt(map, tx, ty)
      if (ch === ' ') continue
      const sx = tx * TILE - camX
      const sy = ty * TILE - camY
      drawTile(ctx, ch, sx, sy, tx, ty, pal, map.era, time, tileAt(map, tx, ty - 1))
      eraDetail(ctx, ch, sx, sy, tx, ty, map.era, time, pal)
    }
  }

  temporalSeed(ctx, map, camX, camY, time, opts.causality)

  const sorted = actors.slice().sort((a, b) => a.y - b.y || a.x - b.x)
  for (const actor of sorted) {
    const sx = Math.round(actor.x - camX)
    const sy = Math.round(actor.y - camY)
    shadow(ctx, sx, sy - 1)
    const frame = actor.moving ? (Math.floor(time * 8) & 1) : 0
    drawSprite(ctx, actor.sprite, sx, sy, {
      dir: actor.dir,
      frame,
      side: false,
      flash: actor.flash === true,
    })
  }
  weather(ctx, map.era, time)
  ctx.imageSmoothingEnabled = false
}
