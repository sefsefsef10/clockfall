import type { Dir, PortraitId, SpriteId } from '../types.ts'
import { Pix, blit } from './pix.ts'

const OUT = '#1a120e'
const SKIN = '#f0c29a'
const SKIN_D = '#d89a72'
const SKIN_HI = '#f7d7bc'
const HAIR_RED = '#c23b2e'
const HAIR_RED_D = '#8e241c'
const HAIR_SILVER = '#d8d3c8'
const HAIR_SILVER_D = '#a39e94'
const HAIR_BROWN = '#6b4a2e'
const HAIR_BROWN_D = '#4a3120'
const BLUE = '#3a5f9a'
const BLUE_D = '#2a4674'
const TEAL = '#1f8a84'
const TEAL_D = '#14645f'
const GOLD = '#d7c07a'
const GOLD_D = '#a89050'
const METAL = '#8aa0a8'
const METAL_D = '#5e7278'
const VIOLET = '#6d4ea3'
const VIOLET_D = '#4a3270'
const ASH = '#6d645c'
const ASH_D = '#4a433c'
const RUST = '#a24b32'
const ENERGY = '#7ec8c3'
const ENERGY_D = '#3e8f8a'
const GRASS = '#6ea84a'
const GRASS_D = '#4e7c34'
const GRASS_HI = '#8fbf5e'
const WOOD = '#a87548'
const WOOD_D = '#6b4a2e'
const STONE = '#8d8f99'
const STONE_D = '#5c5e68'
const WALL = '#efe6d0'
const INK = '#120e18'
const SHADOW = '#241c33'
const BRONZE = '#c48a3a'
const BRONZE_D = '#8c5a22'
const CLOAK = '#2c4f8a'
const CLOAK_D = '#1d355c'
const PALE = '#e4ddd0'
const PALE_D = '#b7aea0'
const EMBER = '#e07a32'
const EMBER_HI = '#f2d15a'
const GREEN = '#2f6b3a'
const GREEN_D = '#1f4a28'
const WHITE = '#fff8ee'
const SOOT = '#3a322c'

type Build = 'normal' | 'plump' | 'kid' | 'broad' | 'robe' | 'block' | 'shadow'
type HairStyle = 'spike' | 'long' | 'short' | 'bald' | 'tuft' | 'slick' | 'messy' | 'none'
type Hat = 'none' | 'kettle' | 'bell' | 'hood' | 'crown'
type Prop = 'none' | 'sword' | 'bow' | 'hammer' | 'spear' | 'tongs' | 'apron' | 'cape'
type Face = 'open' | 'visor' | 'scarf' | 'stone' | 'glow'
type Facing = 'down' | 'up' | 'right'

interface Spec {
  hair: string
  hairD: string
  skin: string
  skinD: string
  cloth: string
  clothD: string
  trim: string
  pants: string
  shoe: string
  accent: string
  build: Build
  hairStyle: HairStyle
  hat: Hat
  prop: Prop
  face: Face
}

const KAEL: Spec = {
  hair: HAIR_RED, hairD: HAIR_RED_D, skin: SKIN, skinD: SKIN_D,
  cloth: BLUE, clothD: BLUE_D, trim: GOLD, pants: '#24344f', shoe: '#241810',
  accent: METAL, build: 'normal', hairStyle: 'spike', hat: 'none', prop: 'sword', face: 'open',
}
const MIRA: Spec = {
  hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
  cloth: TEAL, clothD: TEAL_D, trim: PALE, pants: '#143c3a', shoe: PALE,
  accent: HAIR_RED, build: 'normal', hairStyle: 'long', hat: 'none', prop: 'bow', face: 'open',
}
const TORIN: Spec = {
  hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
  cloth: GOLD, clothD: GOLD_D, trim: METAL, pants: '#3a3128', shoe: '#241810',
  accent: METAL_D, build: 'broad', hairStyle: 'short', hat: 'none', prop: 'hammer', face: 'open',
}
const MAYOR: Spec = {
  hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
  cloth: GREEN, clothD: GREEN_D, trim: GOLD, pants: '#2a211c', shoe: '#241810',
  accent: GOLD, build: 'plump', hairStyle: 'bald', hat: 'none', prop: 'none', face: 'open',
}
const MERCHANT: Spec = {
  hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
  cloth: '#7a4e32', clothD: '#4a3120', trim: WALL, pants: '#3a3128', shoe: '#241810',
  accent: WOOD, build: 'normal', hairStyle: 'short', hat: 'none', prop: 'apron', face: 'open',
}
const KID: Spec = {
  hair: '#e0a050', hairD: WOOD, skin: SKIN, skinD: SKIN_D,
  cloth: BLUE, clothD: BLUE_D, trim: EMBER_HI, pants: HAIR_RED, shoe: '#241810',
  accent: EMBER_HI, build: 'kid', hairStyle: 'tuft', hat: 'none', prop: 'none', face: 'open',
}
const GUARD: Spec = {
  hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
  cloth: '#3e5344', clothD: '#2a3a30', trim: METAL, pants: '#2a211c', shoe: '#241810',
  accent: METAL, build: 'normal', hairStyle: 'short', hat: 'kettle', prop: 'spear', face: 'open',
}
const SMITH: Spec = {
  hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
  cloth: '#5c3a28', clothD: '#3a2418', trim: ASH, pants: '#3a3128', shoe: '#241810',
  accent: METAL, build: 'broad', hairStyle: 'messy', hat: 'none', prop: 'tongs', face: 'open',
}
const SURVIVOR: Spec = {
  hair: ASH, hairD: ASH_D, skin: SKIN, skinD: SKIN_D,
  cloth: ASH, clothD: ASH_D, trim: RUST, pants: INK, shoe: '#241810',
  accent: RUST, build: 'robe', hairStyle: 'none', hat: 'hood', prop: 'none', face: 'scarf',
}
const PRIEST: Spec = {
  hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
  cloth: WALL, clothD: '#d3c6a4', trim: '#7a2e3b', pants: '#7a2e3b', shoe: '#241810',
  accent: BRONZE, build: 'robe', hairStyle: 'none', hat: 'bell', prop: 'none', face: 'open',
}
const NOBLE: Spec = {
  hair: '#2a211c', hairD: INK, skin: SKIN, skinD: SKIN_D,
  cloth: CLOAK, clothD: CLOAK_D, trim: GOLD, pants: INK, shoe: '#241810',
  accent: GOLD, build: 'robe', hairStyle: 'slick', hat: 'none', prop: 'cape', face: 'open',
}
const ACOLYTE: Spec = {
  hair: INK, hairD: INK, skin: '#1c2a2e', skinD: '#10181a',
  cloth: '#1c2a2e', clothD: '#10181a', trim: ENERGY, pants: INK, shoe: INK,
  accent: ENERGY, build: 'robe', hairStyle: 'none', hat: 'hood', prop: 'none', face: 'visor',
}
const OATH: Spec = {
  hair: STONE, hairD: STONE_D, skin: STONE, skinD: STONE_D,
  cloth: STONE, clothD: STONE_D, trim: GOLD, pants: STONE_D, shoe: '#3a3c44',
  accent: GOLD, build: 'block', hairStyle: 'none', hat: 'none', prop: 'none', face: 'stone',
}
const SHADE: Spec = {
  hair: SHADOW, hairD: INK, skin: SHADOW, skinD: INK,
  cloth: SHADOW, clothD: INK, trim: GOLD, pants: INK, shoe: INK,
  accent: ENERGY, build: 'shadow', hairStyle: 'none', hat: 'crown', prop: 'cape', face: 'glow',
}

const HUMANS: Record<string, Spec> = {
  kael: KAEL, mira: MIRA, torin: TORIN, mayor: MAYOR, merchant: MERCHANT, kid: KID,
  guard: GUARD, smith: SMITH, survivor: SURVIVOR, priest: PRIEST, noble: NOBLE,
  acolyte: ACOLYTE, oath: OATH, shade: SHADE,
}

function bake(w: number, h: number, draw: (pix: Pix) => void): HTMLCanvasElement {
  const pix = new Pix(w, h)
  draw(pix)
  outline(pix.canvas)
  return pix.canvas
}

function outline(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const img = ctx.getImageData(0, 0, w, h)
  const src = new Uint8ClampedArray(img.data)
  const outside = new Uint8Array(w * h)
  const stack: number[] = []
  const at = (x: number, y: number) => y * w + x
  const emptyAt = (x: number, y: number) => src[(y * w + x) * 4 + 3] === 0
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = at(x, y)
    if (outside[i] || !emptyAt(x, y)) return
    outside[i] = 1
    stack.push(i)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length > 0) {
    const i = stack.pop()
    if (i === undefined) break
    const x = i % w
    const y = (i / w) | 0
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!outside[at(x, y)]) continue
      let touch = false
      for (let dy = -1; dy <= 1 && !touch; dy++) {
        for (let dx = -1; dx <= 1 && !touch; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          if (src[(ny * w + nx) * 4 + 3] !== 0) touch = true
        }
      }
      if (!touch) continue
      const p = (y * w + x) * 4
      img.data[p] = 0x1a
      img.data[p + 1] = 0x12
      img.data[p + 2] = 0x0e
      img.data[p + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

function meat(pix: Pix, x: number, y: number, w: number, h: number, light: string, dark: string): void {
  pix.rect(x, y, w, h, dark)
  if (w > 1 && h > 1) pix.rect(x, y, w - 1, Math.max(1, h - 1), light)
}

function ball(pix: Pix, cx: number, cy: number, rx: number, ry: number, light: string, dark: string, hi?: string): void {
  pix.ellipse(cx + 0.65, cy + 0.75, rx, ry, dark)
  pix.ellipse(cx - 0.15, cy - 0.2, rx, ry, light)
  if (hi && rx > 2 && ry > 2) pix.ellipse(cx - rx * 0.32, cy - ry * 0.34, Math.max(1, rx * 0.38), Math.max(1, ry * 0.32), hi)
}

function handLine(pix: Pix, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pix.p(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), color)
  }
}

function clockFace(pix: Pix, cx: number, cy: number, r: number, frame: number): void {
  pix.ellipse(cx + 0.4, cy + 0.4, r, r, GOLD_D)
  pix.ellipse(cx, cy, Math.max(1, r - 0.7), Math.max(1, r - 0.7), WALL)
  if (r >= 4) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      pix.p(Math.round(cx + Math.cos(a) * (r - 1.4)), Math.round(cy + Math.sin(a) * (r - 1.4)), GOLD_D)
    }
  }
  pix.ellipse(cx, cy, Math.max(0.6, r * 0.16), Math.max(0.6, r * 0.16), OUT)
  const a1 = -Math.PI / 2
  const a2 = -Math.PI / 2 + (frame ? 1.35 : 0.45)
  handLine(pix, cx, cy, cx + Math.cos(a1) * r * 0.5, cy + Math.sin(a1) * r * 0.5, OUT)
  handLine(pix, cx, cy, cx + Math.cos(a2) * r * 0.78, cy + Math.sin(a2) * r * 0.78, HAIR_RED)
}

function gear(pix: Pix, cx: number, cy: number, r: number, teeth: number, light: string, dark: string, spin: number): void {
  pix.ellipse(cx + 0.4, cy + 0.4, r, r, dark)
  pix.ellipse(cx, cy, Math.max(1, r - 0.8), Math.max(1, r - 0.8), light)
  for (let i = 0; i < teeth; i++) {
    const a = spin + (i / teeth) * Math.PI * 2
    pix.rect(Math.round(cx + Math.cos(a) * r) - 0, Math.round(cy + Math.sin(a) * r), 2, 2, i % 2 ? dark : light)
  }
  pix.ellipse(cx, cy, Math.max(0.8, r * 0.28), Math.max(0.8, r * 0.28), dark)
  pix.p(cx, cy, light)
}

function bellShape(pix: Pix, cx: number, top: number, height: number, light: string, dark: string): void {
  pix.rect(cx - 1, top, 2, 2, dark)
  pix.p(cx - 1, top, light)
  let lastHalf = 2
  let lastY = top + 2
  for (let i = 0; i < height; i++) {
    const t = height <= 1 ? 1 : i / (height - 1)
    const flare = t < 0.62 ? 0.15 + t * 0.25 : 0.3 + ((t - 0.62) / 0.38) * 1.15
    const half = Math.max(2, Math.round(2 + flare * height * 0.42))
    const y = top + 2 + i
    pix.rect(cx - half, y, half * 2, 1, t > 0.78 ? dark : light)
    pix.p(cx - half + 1, y, WHITE)
    lastHalf = half
    lastY = y
  }
  pix.rect(cx - lastHalf, lastY, lastHalf * 2, 1, light)
  pix.p(cx, lastY - 1, dark)
}

function brokenHalo(pix: Pix, cx: number, cy: number, r: number): void {
  for (let d = 0; d < 360; d += 8) {
    if (d > 200 && d < 305) continue
    const a = (d * Math.PI) / 180
    const x = Math.round(cx + Math.cos(a) * r)
    const y = Math.round(cy + Math.sin(a) * r)
    pix.p(x, y, d % 16 === 0 ? GOLD : GOLD_D)
    pix.p(x + 1, y, GOLD)
  }
}

function cloak(pix: Pix, cx: number, y0: number, y1: number, w0: number, w1: number, light: string, dark: string): void {
  const span = Math.max(1, y1 - y0)
  for (let i = 0; i <= span; i++) {
    const t = i / span
    const half = Math.round(w0 + (w1 - w0) * t)
    const y = y0 + i
    const hem = i > span - 3 && (i + half) % 2 === 0 ? -1 : 0
    pix.rect(cx - half, y, half * 2 + hem, 1, light)
    pix.rect(cx - half, y, 2, 1, dark)
    pix.p(cx + 1, y, dark)
  }
}

function cracks(pix: Pix, x: number, y: number, color: string): void {
  pix.p(x, y, color)
  pix.p(x + 1, y + 1, color)
  pix.p(x + 2, y + 1, color)
  pix.p(x + 3, y + 2, color)
  pix.p(x + 3, y + 3, color)
}

function fieldHuman(pix: Pix, spec: Spec, dir: Facing, frame: number): void {
  const step = frame & 1
  const kid = spec.build === 'kid'
  const plump = spec.build === 'plump'
  const broad = spec.build === 'broad'
  const robe = spec.build === 'robe' || spec.build === 'shadow'
  const block = spec.build === 'block'
  const cx = dir === 'right' ? 9 : 8
  const headCy = kid ? 8 : spec.hat === 'bell' || spec.hat === 'kettle' ? 6 : 5
  const headRx = kid ? 2.8 : plump ? 3.5 : dir === 'right' ? 2.7 : 3.15
  const headRy = kid ? 2.6 : 2.55
  const bodyW = kid ? 5 : plump ? 10 : broad ? 9 : robe ? 8 : 7
  const bodyH = kid ? 3 : robe ? 6 : plump ? 5 : 4
  const bodyY = kid ? 11 : robe ? 8 : 8
  const bodyX = Math.round(cx - bodyW / 2)
  const showSkin = spec.face === 'open' || spec.face === 'scarf'
  const hood = spec.hat === 'hood'
  const headL = hood || block || spec.face === 'stone' || spec.face === 'glow' || spec.face === 'visor' ? spec.cloth : spec.skin
  const headD = hood || block || spec.face === 'stone' || spec.face === 'glow' || spec.face === 'visor' ? spec.clothD : spec.skinD
  const headHi = showSkin && !hood ? SKIN_HI : undefined

  const drawLegs = () => {
    if (robe && !kid) {
      pix.p(cx - 2, 14, spec.shoe)
      pix.p(cx + 1, 14, spec.shoe)
      if (step) pix.p(cx + 2, 13, spec.shoe)
      return
    }
    const ly = kid ? 13 : 12
    const spread = step ? 1 : 0
    const left = cx - 3 - spread
    const right = cx + 1 + spread
    meat(pix, left, ly, 2, kid ? 1 : 2, spec.pants, spec.clothD)
    meat(pix, right, ly + (step ? -1 : 0), 2, kid ? 1 : 2, spec.pants, spec.clothD)
    pix.rect(left, 14, 2, 1, spec.shoe)
    pix.rect(right, step ? 13 : 14, 2, 1, spec.shoe)
    pix.p(left, step ? 14 : 13, spec.trim)
  }

  const drawBody = () => {
    if (block) {
      meat(pix, bodyX, bodyY, bodyW, bodyH + 2, spec.cloth, spec.clothD)
      meat(pix, bodyX - 1, bodyY, 2, 3, spec.clothD, STONE_D)
      meat(pix, bodyX + bodyW - 1, bodyY, 2, 3, spec.cloth, spec.clothD)
      pix.rect(bodyX + 1, bodyY + bodyH - 1, bodyW - 2, 1, spec.trim)
      cracks(pix, bodyX + 2, bodyY + 1, GOLD)
      return
    }
    if (plump) {
      ball(pix, cx, bodyY + 2, bodyW / 2, bodyH / 1.5, spec.cloth, spec.clothD)
    } else {
      meat(pix, bodyX, bodyY, bodyW, bodyH, spec.cloth, spec.clothD)
    }
    if (!robe) {
      pix.rect(bodyX + 1, bodyY + bodyH - 2, Math.max(2, bodyW - 2), 1, spec.trim)
      if (dir !== 'up') pix.p(cx, bodyY + bodyH - 2, GOLD)
    } else if (dir !== 'up') {
      pix.rect(cx - 1, bodyY + 2, 2, bodyH - 2, spec.trim)
    } else {
      pix.rect(cx, bodyY + 1, 1, bodyH - 2, spec.clothD)
    }
    if (spec.build === 'shadow') cracks(pix, bodyX + 2, bodyY + 2, spec.accent)
    if (dir !== 'up' && spec.face === 'open' && !kid) {
      pix.rect(bodyX - 1, bodyY + 1, 2, 3, spec.clothD)
      pix.p(bodyX - 1, bodyY + 3, spec.skin)
      pix.rect(bodyX + bodyW - 1, bodyY + 1, 2, 3, spec.cloth)
      pix.p(bodyX + bodyW, bodyY + 3, spec.skinD)
    }
    if (spec.prop === 'apron' && dir !== 'up') {
      meat(pix, cx - 1, bodyY + 1, dir === 'right' ? 3 : 4, bodyH, WALL, '#d3c6a4')
    }
    if (spec.prop === 'cape') {
      pix.rect(bodyX - 2, bodyY + 1, 2, bodyH + 1, spec.clothD)
      pix.p(bodyX - 2, bodyY + bodyH, spec.accent)
    }
    if (spec.prop === 'tongs') {
      pix.p(bodyX + 2, bodyY + 2, SOOT)
      pix.p(cx, headCy + 1, SOOT)
    }
  }

  const drawHead = () => {
    if (dir === 'up') {
      ball(pix, cx, headCy, headRx, headRy, spec.hair === spec.cloth ? spec.cloth : spec.hair, spec.hairD)
      if (spec.hairStyle === 'long') pix.rect(cx - 1, headCy + 1, 2, 4, spec.hairD)
      if (spec.hairStyle === 'spike') {
        pix.p(cx - 2, headCy - 3, spec.hair)
        pix.p(cx, headCy - 3, spec.hairD)
        pix.p(cx + 2, headCy - 3, spec.hair)
      }
      pix.rect(cx - 1, headCy + Math.round(headRy) - 1, 2, 2, spec.skinD)
      return
    }
    if (block) {
      meat(pix, cx - 3, headCy - 3, 6, 6, spec.cloth, spec.clothD)
      pix.rect(cx - 2, headCy, 5, 1, INK)
      pix.p(cx - 1, headCy, GOLD)
      pix.p(cx + 2, headCy, GOLD)
      return
    }
    ball(pix, cx + (dir === 'right' ? 0.4 : 0), headCy, headRx, headRy, headL, headD, headHi)
    if (dir === 'right') {
      pix.p(cx + Math.round(headRx), headCy, headL)
      pix.p(cx + Math.round(headRx), headCy + 1, headD)
    } else {
      pix.p(cx - Math.round(headRx), headCy, spec.skinD)
      pix.p(cx + Math.round(headRx) - 1, headCy, spec.skinD)
    }
    paintHair(pix, spec, dir, cx, headCy)
    paintHat(pix, spec, dir, cx, headCy)
    if (spec.face === 'visor') {
      pix.rect(dir === 'right' ? cx : cx - 2, headCy, dir === 'right' ? 4 : 5, 1, ENERGY)
      pix.p(dir === 'right' ? cx + 1 : cx, headCy, WHITE)
      return
    }
    if (spec.face === 'glow') {
      const ex = dir === 'right' ? cx + 1 : cx - 2
      pix.p(ex, headCy, ENERGY)
      pix.p(ex + 1, headCy, WHITE)
      if (dir !== 'right') pix.p(cx + 2, headCy, ENERGY)
      return
    }
    if (spec.face === 'stone') {
      pix.rect(cx - 2, headCy, 5, 1, INK)
      return
    }
    if (spec.face === 'scarf') {
      pix.rect(cx - 3, headCy + 1, dir === 'right' ? 6 : 7, 2, spec.accent)
      pix.p(cx - 2, headCy + 1, spec.hairD)
    }
    const eye = OUT
    if (dir === 'right') {
      pix.p(cx + 1, headCy, eye)
      pix.p(cx + 1, headCy - 1, spec.hairD)
      if (showSkin) pix.p(cx + 2, headCy + 1, spec.skinD)
    } else {
      pix.p(cx - 2, headCy, eye)
      pix.p(cx + 1, headCy, eye)
      pix.rect(cx - 1, headCy + 1, 2.2, 1.2, spec.skinD)
    }
    if (spec.hairStyle === 'long' && spec.accent === HAIR_RED) {
      const bx = dir === 'right' ? cx - 3 : cx + 3
      pix.p(bx, headCy - 1, HAIR_RED)
      pix.p(bx + 1, headCy - 1, HAIR_RED)
      pix.p(bx, headCy, HAIR_RED_D)
      pix.p(bx + 1, headCy - 2, HAIR_RED)
    }
  }

  drawLegs()
  drawBody()
  if (spec.prop === 'spear') paintSpear(pix, cx, step)
  drawHead()
  paintHandProp(pix, spec, dir, cx, bodyY, step)
}

function paintHair(pix: Pix, spec: Spec, dir: Facing, cx: number, cy: number): void {
  const h = spec.hair
  const d = spec.hairD
  if (spec.hairStyle === 'none' || spec.hat === 'hood') return
  if (spec.hairStyle === 'spike') {
    pix.p(cx - 2, cy - 4, h)
    pix.p(cx, cy - 4, d)
    pix.p(cx + 2, cy - 4, h)
    pix.rect(cx - 3, cy - 3, 6, 2, h)
    pix.p(cx - 2, cy - 3, d)
    return
  }
  if (spec.hairStyle === 'long') {
    pix.rect(cx - 3, cy - 3, 6, 2, h)
    pix.rect(cx - 4, cy - 1, 2, 5, d)
    pix.rect(cx + 3, cy - 1, 2, 4, h)
    pix.p(cx - 3, cy - 3, d)
    return
  }
  if (spec.hairStyle === 'bald') {
    pix.rect(cx - 3, cy - 1, 2, 3, h)
    pix.rect(cx + 2, cy - 1, 2.2, 3, d)
    pix.p(cx - 2, cy - 2, h)
    pix.p(cx + 2, cy - 2, d)
    return
  }
  if (spec.hairStyle === 'tuft') {
    pix.p(cx, cy - 4, h)
    pix.p(cx, cy - 3, d)
    pix.rect(cx - 2, cy - 3, 4, 2, h)
    return
  }
  if (spec.hairStyle === 'slick') {
    pix.rect(cx - 3, cy - 3, 6, 2, h)
    pix.p(cx + 2, cy - 4, d)
    pix.rect(cx - 3, cy - 2, 2.2, 2.2, d)
    return
  }
  if (spec.hairStyle === 'messy') {
    pix.p(cx - 3, cy - 3, d)
    pix.p(cx - 1, cy - 4, h)
    pix.p(cx + 1, cy - 3, d)
    pix.p(cx + 3, cy - 4, h)
    pix.rect(cx - 3, cy - 2, 7, 2.2, h)
    return
  }
  pix.rect(cx - 3, cy - 3, 6, 2.2, h)
  pix.rect(cx - 2, cy - 3, 3, 1, d)
  if (dir === 'right') pix.rect(cx - 3, cy - 1, 2, 2.2, d)
}

function paintHat(pix: Pix, spec: Spec, dir: Facing, cx: number, cy: number): void {
  if (spec.hat === 'kettle') {
    pix.rect(cx - 5, cy - 2, dir === 'right' ? 8 : 10, 1, METAL_D)
    pix.rect(cx - 4, cy - 2, dir === 'right' ? 6 : 8, 1, METAL)
    ball(pix, cx - (dir === 'right' ? 1 : 0), cy - 3, 2.4, 1.7, METAL, METAL_D, WHITE)
    return
  }
  if (spec.hat === 'bell') {
    bellShape(pix, cx, cy - 6, 4, BRONZE, BRONZE_D)
    return
  }
  if (spec.hat === 'hood') {
    ball(pix, cx, cy - 0.2, dir === 'right' ? 3.3 : 3.8, 3.1, spec.cloth, spec.clothD)
    if (dir !== 'up' && spec.face !== 'visor') {
      ball(pix, cx + (dir === 'right' ? 0.6 : 0), cy + 0.4, 2.1, 1.8, spec.skin, spec.skinD, SKIN_HI)
    }
    return
  }
  if (spec.hat === 'crown') {
    pix.rect(cx - 3, cy - 3, 6, 2, GOLD_D)
    pix.rect(cx - 3, cy - 3, 5, 1, GOLD)
    pix.p(cx - 3, cy - 4, GOLD)
    pix.p(cx, cy - 5, GOLD)
    pix.p(cx + 2, cy - 4, GOLD_D)
  }
}

function paintSpear(pix: Pix, cx: number, step: number): void {
  const x = cx + 5
  pix.rect(x, 2, 1, 12, WOOD_D)
  pix.p(x, 2 + step, METAL)
  pix.p(x, 3 + step, METAL)
  pix.p(x - 1, 4, METAL_D)
  pix.p(x + 1, 4, METAL_D)
}

function paintHandProp(pix: Pix, spec: Spec, dir: Facing, cx: number, bodyY: number, step: number): void {
  const x = dir === 'up' ? cx - 5 : cx + 4
  const y = bodyY + 2 + (step ? -1 : 0)
  if (spec.prop === 'sword') {
    pix.rect(x, y - 6, 1, 7, METAL)
    pix.p(x + 1, y - 6, WHITE)
    pix.rect(x - 1, y, 3, 1, GOLD)
    pix.rect(x, y + 1, 1, 2, WOOD_D)
    return
  }
  if (spec.prop === 'bow') {
    for (let i = 0; i < 7; i++) {
      const bend = i < 2 || i > 4 ? 0 : 1
      pix.p(x + bend, y - 5 + i, WOOD)
    }
    pix.rect(x, y - 5, 1, 7, PALE_D)
    pix.p(x + 1, y - 2, WOOD_D)
    return
  }
  if (spec.prop === 'hammer') {
    meat(pix, x - 1, y - 4, 4, 3, METAL, METAL_D)
    pix.rect(x, y - 1, 1, 4, WOOD_D)
    pix.p(x - 1, y - 3, WHITE)
    return
  }
  if (spec.prop === 'tongs') {
    pix.rect(x, y - 2, 1, 5, METAL_D)
    pix.rect(x + 2, y - 2, 1.2, 5, METAL)
    pix.rect(x, y + 2, 3, 1.2, WOOD_D)
  }
}

function paintGnat(pix: Pix, dir: Facing, frame: number): void {
  const flap = frame ? -1 : 0
  const wing = '#d5ecf2'
  if (dir === 'right') {
    pix.ellipse(5, 8 + flap, 4, 2.2, wing)
    pix.p(3, 8 + flap, METAL)
    pix.p(6, 9, METAL_D)
    ball(pix, 10, 8, 3.2, 3.2, METAL, METAL_D, WHITE)
    clockFace(pix, 10, 8, 2.1, frame)
  } else {
    pix.ellipse(3, 7 + flap, 3.2, 1.8, wing)
    pix.ellipse(12, 7 + flap, 3.2, 1.8, wing)
    pix.p(3, 7 + flap, METAL_D)
    pix.p(12, 8, METAL_D)
    ball(pix, 8, 9, 3.3, 3.1, METAL, METAL_D, WHITE)
    if (dir === 'down') clockFace(pix, 8, 9, 2.2, frame)
    else pix.ellipse(8, 9, 1.4, 1.4, METAL_D)
  }
  const ly = 12
  pix.p(6, ly, WOOD_D)
  pix.p(8, ly + (frame ? 0 : 1), WOOD_D)
  pix.p(10, ly, WOOD_D)
}

function paintBriar(pix: Pix, dir: Facing, frame: number): void {
  const y = 9 + (frame ? -1 : 0)
  ball(pix, 8, y, 5, 4.4, GRASS, GRASS_D, GRASS_HI)
  pix.ellipse(6, y - 1, 2.2, 1.6, GRASS_HI)
  const thorns: Array<[number, number]> = [[2, 6], [3, 5], [13, 6], [12, 4], [8, 3], [5, 12], [11, 13]]
  for (const [tx, ty] of thorns) {
    pix.p(tx, ty, WOOD_D)
    pix.p(tx + (tx < 8 ? -1 : 1), ty, WOOD)
  }
  pix.rect(6, 14, 2, 1, WOOD_D)
  pix.rect(9, 14, 2, 1, WOOD)
  if (dir === 'up') return
  if (dir === 'right') {
    pix.rect(10, y - 1, 2, 2, WHITE)
    pix.p(11, y - 1, OUT)
  } else {
    pix.rect(5, y - 1, 2, 2, WHITE)
    pix.rect(9, y - 1, 2, 2.2, WHITE)
    pix.p(6, y, OUT)
    pix.p(10, y, OUT)
  }
}

function paintMite(pix: Pix, dir: Facing, frame: number): void {
  const faceRight = dir !== 'up'
  ball(pix, 8, 9, dir === 'down' ? 5 : 5.4, dir === 'right' ? 3.1 : 3.6, RUST, WOOD_D, EMBER)
  pix.ellipse(7, 8, 2.4, 1.4, WOOD)
  if (dir === 'up') clockFace(pix, 8, 8, 2.4, frame)
  else if (dir === 'down') clockFace(pix, 8, 8, 2.2, frame)
  else clockFace(pix, 8, 8, 2, frame)
  const hx = dir === 'right' ? 13 : dir === 'down' ? 8 : 3
  const hy = dir === 'down' ? 13 : 9
  ball(pix, hx, hy, 1.6, 1.4, WOOD, WOOD_D)
  pix.p(hx + (dir === 'right' ? 1 : 0), hy, OUT)
  const legY = 12 + (frame ? 0 : 1)
  for (const lx of [4, 7, 10]) {
    pix.p(lx, legY, INK)
    pix.p(lx + 1, legY + 1, WOOD_D)
  }
  if (!faceRight) pix.rect(7, 4, 2, 2, METAL)
}

function paintHound(pix: Pix, dir: Facing, frame: number): void {
  const step = frame & 1
  if (dir === 'right') {
    pix.rect(2, 8, 3, 2, VIOLET_D)
    pix.p(1, 7, VIOLET)
    meat(pix, 4, 7, 7, 5, VIOLET, VIOLET_D)
    ball(pix, 12, 7, 3, 2.6, VIOLET, VIOLET_D)
    pix.rect(13, 7, 2, 2, '#c2b0dc')
    pix.p(14, 8, OUT)
    pix.rect(11, 3, 2, 4, VIOLET)
    pix.p(12, 4, VIOLET_D)
    pix.p(12, 6, GOLD)
    pix.rect(5, 12, 2, 2 + step, VIOLET_D)
    pix.rect(10, 12, 2, 3 - step, VIOLET)
    pix.p(5, 14, INK)
    pix.p(10, 14, INK)
    cracks(pix, 7, 8, GOLD)
    return
  }
  if (dir === 'up') {
    pix.rect(7, 12, 2, 3, VIOLET_D)
    pix.p(6, 13, VIOLET)
    ball(pix, 8, 8, 4, 3.3, VIOLET, VIOLET_D)
    pix.rect(4, 3, 2, 4, VIOLET_D)
    pix.rect(10, 3, 2.2, 4, VIOLET)
    pix.rect(5, 12, 2.2, 2.2, VIOLET_D)
    pix.rect(9, 12, 2.2, 2.2, VIOLET)
    cracks(pix, 6, 7, GOLD)
    return
  }
  pix.rect(4, 2, 2, 4, VIOLET_D)
  pix.rect(10, 2.2, 2.2, 4, VIOLET)
  pix.p(5, 3, GOLD_D)
  pix.p(11, 3, GOLD_D)
  ball(pix, 8, 8, 4.2, 3.2, VIOLET, VIOLET_D)
  pix.ellipse(8, 10, 2, 1.3, '#c2b0dc')
  pix.rect(6, 7, 2, 2, GOLD)
  pix.rect(10, 7, 2.2, 2.2, GOLD)
  pix.p(6, 8, OUT)
  pix.p(11, 8, OUT)
  pix.p(8, 10, OUT)
  meat(pix, 4, 11, 3, 3, VIOLET_D, INK)
  meat(pix, 9, 11, 3, 3, VIOLET, VIOLET_D)
  if (step) pix.rect(3, 13, 2, 1, INK)
  cracks(pix, 7, 6, GOLD)
}

function paintEmber(pix: Pix, dir: Facing, frame: number): void {
  const y = frame ? 8 : 9
  ball(pix, 8, y, 3.4, 4.2, RUST, HAIR_RED_D)
  ball(pix, 8, y + 0.4, 2.4, 3, EMBER, RUST, EMBER_HI)
  pix.ellipse(8, y + 1, 1.2, 1.6, EMBER_HI)
  pix.p(6, y - 3, EMBER)
  pix.p(10, y - 2, EMBER_HI)
  pix.p(8, y - 4, RUST)
  if (dir === 'up') {
    pix.p(8, y, GOLD_D)
    return
  }
  const ex = dir === 'right' ? 9 : 8
  pix.rect(ex, y, 2, 2, WHITE)
  pix.p(ex + 1, y + 1, OUT)
}

function paintWisp(pix: Pix, dir: Facing, frame: number): void {
  const spin = frame ? 0.4 : 0
  const shift = dir === 'up' ? -1 : dir === 'right' ? 1 : 0
  gear(pix, 6, 9 + shift, 3.1, 6, METAL, METAL_D, spin)
  gear(pix, 11, 8, 2.6, 5, GOLD, GOLD_D, -spin)
  gear(pix, 8, 12, 2.2, 5, ENERGY, ENERGY_D, spin + 0.2)
}

function paintSaint(pix: Pix, dir: Facing, frame: number): void {
  const cx = dir === 'right' ? 9 : 8
  bellShape(pix, cx, 1, dir === 'up' ? 4 : 5, BRONZE, BRONZE_D)
  if (dir !== 'up') {
    pix.rect(cx - 1, 6, 3, 1, INK)
    pix.p(cx, 6, GOLD)
  }
  meat(pix, cx - 3, 8, 6, 4, GOLD, GOLD_D)
  pix.rect(cx - 4, 8, 2, 2, METAL)
  pix.rect(cx + 2, 8, 2, 2.2, METAL_D)
  meat(pix, cx - 2, 12, 2, 2.2, STONE, STONE_D)
  meat(pix, cx + 1, 12, 2, 2.2, STONE_D, STONE)
  const foot = frame ? cx + 2 : cx + 1
  pix.rect(cx - 2, 14, 2, 1, INK)
  pix.rect(foot, 14, 2, 1, INK)
  pix.p(cx, 10, ENERGY)
}

function paintWraith(pix: Pix, dir: Facing, frame: number): void {
  const pole = dir === 'right' ? 11 : 10
  pix.rect(pole, 1, 1, 14, WOOD_D)
  pix.p(pole, 1, METAL)
  pix.p(pole, 2, METAL)
  pix.p(pole - 1, 3, METAL_D)
  const wide = dir === 'down' ? 7 : 5
  const left = pole - wide
  for (let row = 0; row < 8; row++) {
    const jag = row % 3 === 2 ? -2 : row === 5 ? -3 : 0
    const fade = row > 5 ? PALE_D : PALE
    pix.rect(left, 3 + row + (frame && row > 4 ? 1 : 0), wide + jag, 1, fade)
    if (row === 3) pix.p(left + 2, 3 + row, PALE_D)
  }
  pix.p(left + 1, 7, ASH)
  pix.p(left + 3, 5, WHITE)
}

function paintMinute(pix: Pix, dir: Facing, frame: number): void {
  const x = dir === 'right' ? 9 : 8
  pix.rect(x, 2, 1, 12, METAL)
  pix.p(x + 1, 4, METAL_D)
  pix.p(x, 1.2, WHITE)
  pix.rect(x - 2, 5, 5, 1.2, GOLD_D)
  pix.p(x - 2, 5.2, GOLD)
  pix.p(x + 2, 5.2, GOLD)
  pix.p(x, 13, METAL_D)
  pix.p(x, 14, WHITE)
  const eyeY = frame ? 7 : 6
  if (dir === 'up') pix.p(x, eyeY, GOLD_D)
  else {
    pix.p(x + (dir === 'right' ? 1 : 0), eyeY, OUT)
    pix.p(x, eyeY, WHITE)
  }
}

function paintHour(pix: Pix, dir: Facing, frame: number): void {
  const weightX = dir === 'right' ? 11 : 8
  ball(pix, weightX, 11, 3.2, 3.2, GOLD, GOLD_D, EMBER_HI)
  pix.ellipse(weightX, 11, 1.2, 1.2, GOLD_D)
  handLine(pix, dir === 'up' ? 8 : 5, 3, weightX, 10, METAL)
  handLine(pix, dir === 'up' ? 9 : 6, 3, weightX + 1, 10, GOLD)
  handLine(pix, dir === 'up' ? 7 : 4, 4, weightX - 1, 9, METAL_D)
  pix.rect(dir === 'right' ? 4 : 6, 2, 3, 2.2, METAL)
  if (dir !== 'up') {
    pix.p(weightX + (frame ? 1 : 0), 10, OUT)
    pix.p(weightX, 10, WHITE)
  }
  pix.rect(weightX - 2, 14, 4, 1, GOLD_D)
}

function paintStill(pix: Pix, dir: Facing, frame: number): void {
  const cx = dir === 'right' ? 9 : 8
  cloak(pix, cx, 7, 14, 2, 5, '#c8c2d4', '#6d6880')
  pix.p(cx - 2, 14, INK)
  pix.p(cx + 1, 14, INK)
  if (dir === 'up') {
    ball(pix, cx, 5, 2.6, 2.6, STONE, STONE_D)
  } else {
    clockFace(pix, cx + (dir === 'right' ? 0.4 : 0), 5, 2.5, frame)
  }
  brokenHalo(pix, cx, 5, 4.2)
}

function paintChest(pix: Pix, open: boolean, dir: Facing, frame: number): void {
  if (dir === 'up') {
    meat(pix, 3, 5, 10, 7, WOOD, WOOD_D)
    pix.rect(4, 6, 8, 1, open ? WALL : WOOD_D)
    if (open) pix.rect(5, 7, 6, 3, '#f7f1e4')
    pix.rect(7, 8, 2, 2, frame ? EMBER_HI : GOLD)
    return
  }
  const side = dir === 'right'
  meat(pix, side ? 4 : 3, 8, side ? 8 : 10, 6, WOOD, WOOD_D)
  if (side) pix.rect(3, 9, 2, 5, WOOD_D)
  if (open) {
    pix.rect(4, 3, 8, 2, WOOD)
    pix.rect(5, 2, 5, 2, WOOD_D)
    pix.rect(5, 8, 6, 3, '#f7f1e4')
    pix.p(6, 9, GOLD_D)
  } else {
    meat(pix, side ? 4 : 2, 6, side ? 8 : 12, 3, '#c48a4a', WOOD)
    pix.rect(3, 8, 10, 1, WOOD_D)
  }
  pix.rect(7, 9, 2, 2, frame ? EMBER_HI : GOLD)
  pix.p(7, 9, frame ? WHITE : GOLD_D)
}

function paintBellPost(pix: Pix, dir: Facing, frame: number): void {
  const cx = dir === 'right' ? 9 : 8
  pix.rect(cx - 1, 8, 2, 7, WOOD_D)
  pix.p(cx - 1, 10, WOOD)
  pix.rect(cx - 4, 7, 8, 1, METAL_D)
  bellShape(pix, cx, 1, 4, BRONZE, BRONZE_D)
  pix.p(cx + (frame ? 1 : 0), 6, GOLD)
  if (dir === 'up') pix.ellipse(cx, 4, 2.2, 1.2, BRONZE_D)
}

function paintField(id: SpriteId, pix: Pix, dir: Facing, frame: number): void {
  const human = HUMANS[id]
  if (human) {
    fieldHuman(pix, human, dir, frame)
    return
  }
  switch (id) {
    case 'gnatcoil': paintGnat(pix, dir, frame); break
    case 'briarhusk': paintBriar(pix, dir, frame); break
    case 'clockmite': paintMite(pix, dir, frame); break
    case 'hound': paintHound(pix, dir, frame); break
    case 'cindermote': paintEmber(pix, dir, frame); break
    case 'wisp': paintWisp(pix, dir, frame); break
    case 'saint': paintSaint(pix, dir, frame); break
    case 'wraith': paintWraith(pix, dir, frame); break
    case 'minute': paintMinute(pix, dir, frame); break
    case 'hour': paintHour(pix, dir, frame); break
    case 'stillness': paintStill(pix, dir, frame); break
    case 'chest': paintChest(pix, false, dir, frame); break
    case 'chest-open': paintChest(pix, true, dir, frame); break
    case 'bell': paintBellPost(pix, dir, frame); break
    default:
      void id
      break
  }
}

function paintSideHero(pix: Pix, spec: Spec, frame: number): void {
  if (spec.build === 'block') {
    paintBlockBattle(pix, spec, frame)
    return
  }
  if (spec.build === 'shadow') {
    paintShadeBattle(pix, spec, frame)
    return
  }
  const w = pix.canvas.width
  const h = pix.canvas.height
  const step = frame & 1
  const kid = spec.build === 'kid'
  const plump = spec.build === 'plump'
  const broad = spec.build === 'broad' || plump
  const robe = spec.build === 'robe'
  const foot = h - 2
  const headR = kid ? 5 : plump ? 7 : 6
  const headCx = Math.round(w * (kid ? 0.58 : 0.6))
  const headCy = spec.hat === 'bell' ? Math.round(h * 0.36) : spec.hat === 'kettle' ? Math.round(h * 0.34) : Math.round(h * (kid ? 0.4 : 0.3))
  const hood = spec.hat === 'hood'
  const showSkin = spec.face === 'open' || spec.face === 'scarf'
  const headL = hood || spec.face === 'visor' ? spec.cloth : spec.skin
  const headD = hood || spec.face === 'visor' ? spec.clothD : spec.skinD
  ball(pix, headCx, headCy, headR, headR - 0.4, headL, headD, showSkin && !hood ? SKIN_HI : undefined)
  if (showSkin && !hood) {
    ball(pix, headCx - headR + 2, headCy + 1, 1.6, 2, spec.skinD, spec.skinD)
  }
  const bodyW = broad ? Math.round(w * 0.5) : kid ? 10 : 13
  const bodyH = robe ? Math.round(h * 0.42) : kid ? 8 : 12
  const bodyX = headCx - Math.round(bodyW * 0.55)
  const bodyY = headCy + headR - 3
  if (spec.prop === 'cape') {
    cloak(pix, bodyX + 2, bodyY, foot - 1, 3, 7, spec.clothD, INK)
  }
  if (robe) {
    cloak(pix, headCx - 1, bodyY, foot - 1, 4, plump ? 10 : 7, spec.cloth, spec.clothD)
    pix.rect(headCx - 1, bodyY + 3, 2, bodyH, spec.trim)
  } else if (plump) {
    ball(pix, headCx - 1, bodyY + 6, 8, 7, spec.cloth, spec.clothD)
    pix.rect(headCx - 2, bodyY + 8, 3, 2, spec.trim)
    pix.p(headCx - 1, bodyY + 9, GOLD)
  } else {
    meat(pix, bodyX, bodyY, bodyW, bodyH, spec.cloth, spec.clothD)
    pix.rect(bodyX, bodyY, 3, bodyH, spec.clothD)
    pix.rect(bodyX + 2, bodyY + bodyH - 4, bodyW - 4, 2, spec.trim)
    pix.p(bodyX + bodyW - 6, bodyY + bodyH - 4, GOLD)
    if (broad) {
      ball(pix, bodyX + 2, bodyY + 2, 3.2, 2.4, spec.cloth, spec.clothD)
      ball(pix, bodyX + bodyW - 3, bodyY + 2, 3.4, 2.6, spec.trim, spec.clothD)
    }
  }
  const armX = headCx + 1
  const armY = bodyY + 2 + (step ? -1 : 0)
  if (!robe) {
    meat(pix, armX, armY, 5, 8, spec.cloth, spec.clothD)
    meat(pix, armX + 3, armY + 6, 4, 5, spec.clothD, spec.clothD)
    if (showSkin) meat(pix, armX + 5, armY + 10, 3, 3, spec.skin, spec.skinD)
  } else {
    meat(pix, armX + 1, armY, 4, 8, spec.cloth, spec.clothD)
  }
  if (!robe) {
    const backX = bodyX - 1 - (step ? 2 : 0)
    const frontX = bodyX + Math.round(bodyW * 0.45) + (step ? 3 : 0)
    meat(pix, backX, bodyY + bodyH - 2, 5, foot - (bodyY + bodyH) + 2, spec.pants, spec.clothD)
    meat(pix, frontX, bodyY + bodyH - 3, 6, foot - (bodyY + bodyH) + 3, spec.pants, INK)
    pix.rect(backX - 1, foot - 3, 7, 3, spec.shoe)
    pix.rect(frontX, foot - 3, 8, 3, spec.shoe)
    pix.rect(frontX + 1, foot - 3, 3, 1, spec.trim)
    pix.p(backX, foot - 2, spec.clothD)
  } else {
    pix.rect(headCx - 4, foot - 2, 3, 2.2, spec.shoe)
    pix.rect(headCx + 1 + (step ? 2 : 0), foot - 2, 3, 2.2, spec.shoe)
  }
  paintBattleHair(pix, spec, headCx, headCy, headR)
  paintBattleHat(pix, spec, headCx, headCy, headR)
  if (spec.face === 'visor') {
    pix.rect(headCx + 1, headCy - 1, headR, 2, INK)
    pix.rect(headCx + 2, headCy - 1, headR - 2, 2.2, ENERGY)
    pix.p(headCx + headR - 1, headCy - 1, WHITE)
  } else if (spec.face === 'scarf') {
    pix.rect(headCx - 1, headCy + 2, headR + 2, 3, spec.accent)
    pix.rect(headCx + 2, headCy - 1, 3, 2.2, WHITE)
    pix.p(headCx + 3, headCy, OUT)
    pix.p(headCx + 4, headCy - 1, spec.hairD)
  } else if (showSkin) {
    pix.rect(headCx + Math.round(headR * 0.35), headCy - 1, 3, 3, WHITE)
    pix.rect(headCx + Math.round(headR * 0.45), headCy, 2, 2.2, spec.accent === ENERGY ? ENERGY : OUT)
    pix.p(headCx + Math.round(headR * 0.55), headCy, '#1a120e')
    pix.p(headCx + Math.round(headR * 0.35), headCy - 1, WHITE)
    pix.p(headCx + headR - 1, headCy + 1, spec.skin)
    pix.p(headCx + headR, headCy + 2, spec.skinD)
    pix.rect(headCx + 2, headCy - Math.round(headR * 0.55), 4, 1, spec.hairD)
    pix.p(headCx + 3, headCy + 3, spec.skinD)
  }
  if (spec.prop === 'tongs') {
    pix.p(headCx + 2, headCy + 2, SOOT)
    pix.rect(armX + 4, armY + 6, 2, 2.2, SOOT)
  }
  const hx = armX + 6
  const hy = armY + 11
  paintBattleProp(pix, spec, hx, hy, foot, step)
}

function paintBattleHair(pix: Pix, spec: Spec, cx: number, cy: number, r: number): void {
  if (spec.hairStyle === 'none' || spec.hat === 'hood') return
  const h = spec.hair
  const d = spec.hairD
  if (spec.hairStyle === 'spike') {
    pix.rect(cx - 2, cy - r - 2, 2, 3, d)
    pix.rect(cx + 1, cy - r - 3, 2, 4, h)
    pix.rect(cx + 4, cy - r - 1, 2, 3, d)
    pix.rect(cx - r + 1, cy - r + 1, r + 3, 3, h)
    pix.rect(cx - r, cy - 1, 3, r, d)
    return
  }
  if (spec.hairStyle === 'long') {
    pix.rect(cx - r, cy - r + 1, r + 2, 3, h)
    pix.rect(cx - r - 1, cy - 2, 4, r + 6, d)
    pix.rect(cx - r, cy - 1, 2, r + 4, h)
    pix.p(cx - r - 1, cy + 1, HAIR_RED)
    pix.p(cx - r - 2, cy, HAIR_RED)
    pix.p(cx - r - 2, cy + 2, HAIR_RED_D)
    pix.p(cx - r, cy + 1, HAIR_RED)
    return
  }
  if (spec.hairStyle === 'bald') {
    pix.rect(cx - r, cy - 1, 3, r, h)
    pix.rect(cx - r + 1, cy - r + 2, 3, 2, d)
    return
  }
  if (spec.hairStyle === 'tuft') {
    pix.rect(cx, cy - r - 2, 2, 3, h)
    pix.rect(cx - 2, cy - r + 1, r, 2, d)
    return
  }
  if (spec.hairStyle === 'slick') {
    pix.rect(cx - r + 1, cy - r, r + 2, 3, h)
    pix.p(cx + 2, cy - r - 1, d)
    pix.rect(cx - r, cy - 2, 3, 4, d)
    return
  }
  if (spec.hairStyle === 'messy') {
    pix.p(cx - 2, cy - r - 1, d)
    pix.p(cx + 1, cy - r - 2, h)
    pix.p(cx + 4, cy - r, d)
    pix.rect(cx - r + 1, cy - r + 2, r + 1, 3, h)
    pix.rect(cx - r, cy, 3, 3, d)
    return
  }
  pix.rect(cx - r + 1, cy - r, r + 1, 3, h)
  pix.rect(cx - 1, cy - r, 3, 2, d)
  pix.rect(cx - r, cy - 1, 3, 3, d)
}

function paintBattleHat(pix: Pix, spec: Spec, cx: number, cy: number, r: number): void {
  if (spec.hat === 'kettle') {
    pix.rect(cx - r - 2, cy - 2, r * 2 + 2, 2, METAL_D)
    pix.rect(cx - r - 1, cy - 2, r * 2, 1, METAL)
    ball(pix, cx - 1, cy - r + 1, r - 1, r - 2, METAL, METAL_D, WHITE)
    return
  }
  if (spec.hat === 'bell') {
    bellShape(pix, cx, cy - r - 8, 8, BRONZE, BRONZE_D)
    return
  }
  if (spec.hat === 'hood') {
    ball(pix, cx - 1, cy, r + 1.4, r + 1, spec.cloth, spec.clothD)
    if (spec.face === 'scarf' || spec.face === 'open') {
      ball(pix, cx + 1, cy + 1, r - 1.5, r - 1.2, spec.skin, spec.skinD, SKIN_HI)
    }
    return
  }
  if (spec.hat === 'crown') {
    pix.rect(cx - 4, cy - r, 10, 3, GOLD_D)
    pix.rect(cx - 4, cy - r, 9, 2, GOLD)
    pix.rect(cx - 4, cy - r - 3, 2, 3, GOLD)
    pix.rect(cx, cy - r - 4, 2, 4, GOLD_D)
    pix.rect(cx + 4, cy - r - 3, 2, 3, GOLD)
  }
}

function paintBattleProp(pix: Pix, spec: Spec, hx: number, hy: number, foot: number, step: number): void {
  if (spec.prop === 'sword') {
    pix.rect(hx, hy - 16, 2, 16, METAL)
    pix.rect(hx + 1, hy - 16, 1, 15, WHITE)
    pix.rect(hx - 2, hy - 1, 6, 2, GOLD)
    pix.rect(hx, hy + 1, 2, 3, WOOD_D)
    return
  }
  if (spec.prop === 'bow') {
    for (let i = 0; i < 16; i++) {
      const bend = Math.round(Math.sin((i / 15) * Math.PI) * 4)
      pix.p(hx + bend, hy - 14 + i, WOOD)
      pix.p(hx + bend + 1, hy - 14 + i, WOOD_D)
    }
    pix.rect(hx, hy - 14, 1, 16, PALE)
    return
  }
  if (spec.prop === 'hammer') {
    meat(pix, hx - 2, hy - 10, 10, 7, METAL, METAL_D)
    pix.rect(hx + 1, hy - 8, 3, 2, WHITE)
    pix.rect(hx + 2, hy - 3, 2, 12, WOOD_D)
    pix.rect(hx + 2, hy - 3, 1, 12, WOOD)
    return
  }
  if (spec.prop === 'spear') {
    const x = hx + 2
    pix.rect(x, 2, 2, foot - 4, WOOD_D)
    pix.rect(x, 2, 1, foot - 4, WOOD)
    meat(pix, x - 1, 2, 4, 5, METAL, METAL_D)
    pix.p(x, 3, WHITE)
    return
  }
  if (spec.prop === 'tongs') {
    pix.rect(hx, hy - 8, 2, 12, METAL_D)
    pix.rect(hx + 4, hy - 8, 2.2, 12, METAL)
    pix.rect(hx, hy + 2, 6, 2.2, WOOD_D)
    pix.p(hx + 1, hy - 7, WHITE)
    return
  }
  if (spec.prop === 'apron') {
    meat(pix, hx - 8, hy - 8, 8, 12, WALL, '#d3c6a4')
    pix.rect(hx - 6, hy - 2, 2, 2, WOOD_D)
    void step
  }
}

function paintBlockBattle(pix: Pix, spec: Spec, frame: number): void {
  const step = frame & 1
  const foot = pix.canvas.height - 2
  meat(pix, 14, 6, 12, 11, spec.cloth, spec.clothD)
  pix.rect(18, 10, 7, 2, INK)
  pix.p(20, 10, GOLD)
  pix.p(23, 11, GOLD)
  meat(pix, 10, 16, 16, 12, spec.cloth, spec.clothD)
  meat(pix, 8, 16, 5, 5, spec.clothD, STONE_D)
  meat(pix, 22, 17, 6, 5, spec.trim, spec.clothD)
  pix.rect(14, 24, 10, 2, GOLD_D)
  meat(pix, 8 - (step ? 2 : 0), 28, 6, foot - 28, spec.pants, STONE_D)
  meat(pix, 18 + (step ? 2 : 0), 28, 7, foot - 28, spec.cloth, spec.clothD)
  pix.rect(7, foot - 3, 8, 3, spec.shoe)
  pix.rect(18, foot - 3, 8, 3, spec.shoe)
  cracks(pix, 16, 18, GOLD)
  cracks(pix, 20, 8, GOLD)
  meat(pix, 24, 20, 4, 8, spec.clothD, STONE_D)
}

function paintShadeBattle(pix: Pix, spec: Spec, frame: number): void {
  const step = frame & 1
  const foot = pix.canvas.height - 2
  cloak(pix, 14, 16, foot, 4, 9, spec.clothD, INK)
  cloak(pix, 18, 18, foot - 1, 3, 6, spec.cloth, spec.clothD)
  ball(pix, 20, 12, 6, 6, spec.cloth, spec.clothD)
  pix.rect(14, 6, 12, 3, GOLD_D)
  pix.rect(14, 6, 11, 2, GOLD)
  pix.rect(14, 3, 2, 4, GOLD)
  pix.rect(19, 2, 2.2, 5, GOLD_D)
  pix.rect(24, 4, 2.2, 3, GOLD)
  pix.rect(22, 11, 4, 3, ENERGY)
  pix.p(24, 11, WHITE)
  pix.rect(12, 20, 4, 8, spec.clothD)
  pix.rect(22, 20 + (step ? -2 : 0), 4, 7, spec.cloth)
  pix.p(18, foot, spec.accent)
  pix.p(22, foot - 1, spec.accent)
}

function paintGnatBattle(pix: Pix, frame: number): void {
  const flap = frame ? 2 : 0
  pix.ellipse(6, 12 - flap, 7, 3.2, '#d5ecf2')
  pix.ellipse(28, 12 - flap, 7, 3.2, '#e7f4f6')
  pix.ellipse(8, 20 + flap, 5, 2.2, METAL)
  pix.ellipse(26, 20 + flap, 5, 2.2, METAL_D)
  pix.p(4, 12, ENERGY)
  pix.p(30, 13, ENERGY_D)
  ball(pix, 17, 16, 8, 7.5, METAL, METAL_D, WHITE)
  clockFace(pix, 18, 16, 5.5, frame)
  for (const lx of [10, 14, 20, 24]) pix.rect(lx, 24, 1, 4, WOOD_D)
  pix.p(12, 8, METAL_D)
  pix.p(22, 8, METAL)
}

function paintBriarBattle(pix: Pix, frame: number): void {
  const y = 16 + (frame ? -1 : 0)
  ball(pix, 17, y, 12, 11, GRASS, GRASS_D, GRASS_HI)
  pix.ellipse(12, y - 4, 5, 3, GRASS_HI)
  pix.ellipse(22, y - 2, 4, 2.5, GRASS_D)
  const spikes: Array<[number, number, number, number]> = [
    [4, 8, 8, 12], [28, 6, 22, 12], [16, 3, 16, 8], [6, 22, 10, 18], [30, 20, 24, 16],
  ]
  for (const [x0, y0, x1, y1] of spikes) {
    handLine(pix, x0, y0, x1, y1, WOOD_D)
    pix.p(x0, y0, WOOD)
  }
  pix.rect(10, y - 2, 4, 4, WHITE)
  pix.rect(20, y - 2, 4, 4, WHITE)
  pix.rect(12, y - 1, 2, 2.2, OUT)
  pix.rect(22, y - 1, 2.2, 2.2, OUT)
  meat(pix, 8, 28, 4, 6, WOOD_D, INK)
  meat(pix, 20, 28, 4, 6, WOOD, WOOD_D)
}

function paintMiteBattle(pix: Pix, frame: number): void {
  ball(pix, 16, 16, 12, 8, RUST, WOOD_D, EMBER)
  pix.ellipse(14, 13, 6, 3, WOOD)
  clockFace(pix, 15, 14, 4.2, frame)
  ball(pix, 30, 16, 4, 3.4, WOOD, WOOD_D)
  pix.rect(33, 15, 3, 2, INK)
  pix.p(32, 15, OUT)
  pix.p(31, 14, WHITE)
  const bob = frame ? 1 : 0
  for (const [lx, len] of [[8, 6], [14, 7], [22, 6]] as const) {
    pix.rect(lx, 22, 2, len + bob, INK)
    pix.p(lx + 1, 22 + len, WOOD)
  }
  pix.rect(28, 12, 4, 1, METAL)
}

function paintHoundBattle(pix: Pix, frame: number): void {
  const step = frame & 1
  pix.rect(2, 14, 6, 3, VIOLET_D)
  pix.p(1, 13, VIOLET)
  meat(pix, 6, 12, 16, 10, VIOLET, VIOLET_D)
  ball(pix, 26, 12, 6, 5, VIOLET, VIOLET_D)
  pix.rect(28, 4, 4, 8, VIOLET)
  pix.rect(29, 6, 2, 4, VIOLET_D)
  pix.rect(30, 12, 6, 4, '#c2b0dc')
  pix.p(34, 14, OUT)
  pix.rect(28, 11, 3, 3, GOLD)
  pix.p(29, 12, OUT)
  pix.p(30, 11, WHITE)
  meat(pix, 8, 22, 5, 8 + step, VIOLET_D, INK)
  meat(pix, 16, 22, 5, 9 - step, VIOLET, VIOLET_D)
  meat(pix, 24, 20, 4, 8, VIOLET_D, INK)
  pix.rect(8, 30, 6, 2, INK)
  pix.rect(16, 31, 6, 2, INK)
  cracks(pix, 14, 14, GOLD)
  cracks(pix, 27, 10, GOLD)
}

function paintEmberBattle(pix: Pix, frame: number): void {
  const y = 16 + (frame ? -2 : 0)
  ball(pix, 14, y + 2, 8, 12, HAIR_RED_D, RUST)
  ball(pix, 14, y, 6, 9, EMBER, RUST, EMBER_HI)
  pix.ellipse(13, y + 2, 3, 4, EMBER_HI)
  pix.p(8, y - 8, EMBER)
  pix.p(18, y - 10, EMBER_HI)
  pix.p(14, y - 12, RUST)
  pix.p(20, y - 4, EMBER)
  pix.rect(15, y - 1, 4, 4, WHITE)
  pix.rect(17, y, 2, 2, OUT)
  pix.p(16, y, WHITE)
}

function paintWispBattle(pix: Pix, frame: number): void {
  const spin = frame ? 0.35 : 0
  gear(pix, 12, 18, 8, 8, METAL, METAL_D, spin)
  gear(pix, 24, 14, 6, 7, GOLD, GOLD_D, -spin + 0.2)
  gear(pix, 20, 26, 5, 6, ENERGY, ENERGY_D, spin + 0.5)
}

function paintSaintBattle(pix: Pix, frame: number): void {
  const step = frame & 1
  bellShape(pix, 20, 2, 14, BRONZE, BRONZE_D)
  pix.rect(16, 16, 8, 3, INK)
  pix.p(18, 17, GOLD)
  pix.p(22, 17, ENERGY)
  meat(pix, 12, 20, 16, 16, GOLD, GOLD_D)
  meat(pix, 8, 20, 6, 6, METAL, METAL_D)
  meat(pix, 24, 22, 6, 6, METAL_D, STONE_D)
  pix.rect(14, 32, 12, 2, METAL)
  meat(pix, 12 - (step ? 2 : 0), 36, 6, 16, STONE, STONE_D)
  meat(pix, 22 + (step ? 2 : 0), 36, 7, 16, STONE_D, INK)
  pix.rect(10, 50, 8, 4, INK)
  pix.rect(22, 50, 9, 4, '#241810')
  pix.p(16, 26, ENERGY)
  cracks(pix, 18, 28, GOLD)
}

function paintWraithBattle(pix: Pix, frame: number): void {
  pix.rect(20, 2, 2, 44, WOOD_D)
  pix.rect(20, 2, 1, 44, WOOD)
  meat(pix, 18, 2, 6, 6, METAL, METAL_D)
  pix.p(21, 3, WHITE)
  const tears = [0, -1, -2, -6, -2, 0, -1, -5, -8, -3, 0, -2, -4, -9, -2, -1, 0, -6, -3, -1, -7, -2]
  for (let row = 0; row < 22; row++) {
    const jag = tears[row] ?? -2
    const y = 8 + row + (frame && row > 12 ? 1 : 0)
    const width = 14 + jag
    if (width < 3) continue
    pix.rect(6, y, width, 1, row % 2 ? PALE : PALE_D)
    if (row % 5 === 3) pix.rect(8, y, 2, 1, ASH)
  }
  pix.p(10, 16, WHITE)
  pix.p(12, 20, PALE_D)
}

function paintMinuteBattle(pix: Pix, frame: number): void {
  const x = 8
  pix.p(x + 1, 41, WHITE)
  pix.rect(x, 16, 2, 25, METAL)
  pix.rect(x, 16, 1, 23, WHITE)
  ball(pix, x + 1, 12, 4, 5, METAL, METAL_D, WHITE)
  pix.rect(x - 4, 15, 10, 2, GOLD_D)
  pix.rect(x - 3, 15, 8, 1, GOLD)
  const eye = frame ? 12 : 11
  pix.rect(x, eye, 3, 3, WHITE)
  pix.rect(x + 1, eye + 1, 2, 2, OUT)
  pix.p(x, eye, WHITE)
}

function paintHourBattle(pix: Pix, frame: number): void {
  ball(pix, 27, 8, 6, 6, METAL, METAL_D, WHITE)
  pix.ellipse(27, 8, 2, 2, OUT)
  const yOff = frame ? 1 : 0
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const x = 24 - t * 10
    const y = 12 + t * 12 + yOff
    pix.ellipse(x, y, 4.4, 3.6, GOLD_D)
    pix.ellipse(x - 0.4, y - 0.4, 3, 2.3, GOLD)
  }
  ball(pix, 11, 30, 8, 8, GOLD, GOLD_D, EMBER_HI)
  pix.ellipse(11, 30, 3, 3, GOLD_D)
  pix.rect(13, 26, 4, 4, WHITE)
  pix.rect(14, 27, 2, 2, OUT)
  pix.p(13, 26, WHITE)
  cracks(pix, 8, 28, WHITE)
}

function paintStillBattle(pix: Pix, frame: number): void {
  cloak(pix, 20, 24, 62, 6, 12, '#d8d3c8', '#6d6880')
  pix.rect(14, 40, 2, 20, '#8a8494')
  pix.rect(24, 36, 2, 24, '#5c5868')
  pix.p(16, 62, INK)
  pix.p(24, 62, INK)
  clockFace(pix, 20, 16, 8, frame)
  brokenHalo(pix, 20, 16, 12)
  pix.rect(12, 24, 4, 6, '#c8c2d4')
  pix.p(28, 20, GOLD)
}

function paintChestBattle(pix: Pix, open: boolean, frame: number): void {
  meat(pix, 6, 10, 20, 14, WOOD, WOOD_D)
  pix.rect(4, 12, 4, 12, WOOD_D)
  if (open) {
    pix.rect(8, 2, 16, 4, WOOD)
    pix.rect(12, 1, 8, 3, WOOD_D)
    pix.rect(8, 10, 16, 8, '#f7f1e4')
    pix.rect(10, 12, 12, 4, WALL)
    pix.p(14, 14, GOLD)
  } else {
    meat(pix, 5, 6, 22, 6, '#c48a4a', WOOD)
    pix.rect(6, 11, 20, 2, WOOD_D)
  }
  pix.rect(14, 14, 4, 4, frame ? EMBER_HI : GOLD)
  pix.p(15, 15, frame ? WHITE : GOLD_D)
  pix.rect(8, 16, 16, 1, WOOD_D)
}

function paintBellBattle(pix: Pix, frame: number): void {
  pix.rect(11, 16, 3, 22, WOOD_D)
  pix.rect(11, 18, 1, 18, WOOD)
  pix.rect(4, 14, 16, 2, METAL_D)
  bellShape(pix, 12, 1, 10, BRONZE, BRONZE_D)
  pix.p(12 + (frame ? 2 : 0), 12, GOLD)
  pix.ellipse(12, 6, 3, 1.4, BRONZE_D)
}

function paintBattle(id: SpriteId, pix: Pix, frame: number): void {
  const human = HUMANS[id]
  if (human) {
    paintSideHero(pix, human, frame)
    return
  }
  switch (id) {
    case 'gnatcoil': paintGnatBattle(pix, frame); break
    case 'briarhusk': paintBriarBattle(pix, frame); break
    case 'clockmite': paintMiteBattle(pix, frame); break
    case 'hound': paintHoundBattle(pix, frame); break
    case 'cindermote': paintEmberBattle(pix, frame); break
    case 'wisp': paintWispBattle(pix, frame); break
    case 'saint': paintSaintBattle(pix, frame); break
    case 'wraith': paintWraithBattle(pix, frame); break
    case 'minute': paintMinuteBattle(pix, frame); break
    case 'hour': paintHourBattle(pix, frame); break
    case 'stillness': paintStillBattle(pix, frame); break
    case 'chest': paintChestBattle(pix, false, frame); break
    case 'chest-open': paintChestBattle(pix, true, frame); break
    case 'bell': paintBellBattle(pix, frame); break
    default:
      void id
      break
  }
}

function battleSize(id: SpriteId): [number, number] {
  switch (id) {
    case 'stillness': return [40, 64]
    case 'saint': return [40, 56]
    case 'wraith': return [30, 48]
    case 'minute': return [18, 44]
    case 'hour': return [40, 40]
    case 'kid': return [26, 34]
    case 'mayor': return [36, 40]
    case 'smith': return [36, 40]
    case 'hound': return [40, 34]
    case 'clockmite': return [40, 32]
    case 'gnatcoil': return [36, 32]
    case 'wisp': return [36, 36]
    case 'chest':
    case 'chest-open': return [32, 28]
    case 'bell': return [24, 40]
    case 'cindermote': return [28, 36]
    case 'briarhusk': return [36, 36]
    default: return [32, 40]
  }
}

interface Bust {
  bg: string
  edge: string
  hair: string
  hairD: string
  skin: string
  skinD: string
  cloth: string
  clothD: string
  trim: string
  iris: string
  hairStyle: 'spike' | 'long' | 'short' | 'bald' | 'tuft' | 'slick' | 'messy' | 'hood' | 'bell' | 'wolf' | 'clock'
  mouth: 'smile' | 'frown' | 'flat' | 'smirk'
  brow: 'stern' | 'soft' | 'worried' | 'normal'
  extra: 'bow' | 'apron' | 'scarf' | 'armor' | 'none' | 'freckles' | 'chain'
}

const BUSTS: Record<PortraitId, Bust> = {
  kael: {
    bg: '#1c2433', edge: BLUE_D, hair: HAIR_RED, hairD: HAIR_RED_D, skin: SKIN, skinD: SKIN_D,
    cloth: BLUE, clothD: BLUE_D, trim: GOLD, iris: '#2a4674', hairStyle: 'spike', mouth: 'frown', brow: 'stern', extra: 'none',
  },
  mira: {
    bg: '#102422', edge: TEAL_D, hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
    cloth: TEAL, clothD: TEAL_D, trim: PALE, iris: TEAL_D, hairStyle: 'long', mouth: 'smile', brow: 'soft', extra: 'bow',
  },
  torin: {
    bg: '#2a2418', edge: GOLD_D, hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
    cloth: GOLD, clothD: GOLD_D, trim: METAL, iris: HAIR_BROWN, hairStyle: 'short', mouth: 'flat', brow: 'stern', extra: 'armor',
  },
  mayor: {
    bg: '#1a2a1c', edge: GREEN_D, hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
    cloth: GREEN, clothD: GREEN_D, trim: GOLD, iris: '#3e6a38', hairStyle: 'bald', mouth: 'smile', brow: 'soft', extra: 'chain',
  },
  merchant: {
    bg: '#2a2018', edge: WOOD_D, hair: HAIR_BROWN, hairD: HAIR_BROWN_D, skin: SKIN, skinD: SKIN_D,
    cloth: '#7a4e32', clothD: '#4a3120', trim: WALL, iris: HAIR_BROWN_D, hairStyle: 'short', mouth: 'smile', brow: 'normal', extra: 'apron',
  },
  survivor: {
    bg: '#241c18', edge: ASH_D, hair: ASH, hairD: ASH_D, skin: SKIN, skinD: SKIN_D,
    cloth: ASH, clothD: ASH_D, trim: RUST, iris: '#d7c07a', hairStyle: 'hood', mouth: 'flat', brow: 'worried', extra: 'scarf',
  },
  priest: {
    bg: '#2a241c', edge: BRONZE_D, hair: HAIR_SILVER, hairD: HAIR_SILVER_D, skin: SKIN, skinD: SKIN_D,
    cloth: WALL, clothD: '#d3c6a4', trim: '#7a2e3b', iris: '#6a5a4a', hairStyle: 'bell', mouth: 'smile', brow: 'soft', extra: 'none',
  },
  noble: {
    bg: '#161a28', edge: CLOAK_D, hair: '#2a211c', hairD: INK, skin: SKIN, skinD: SKIN_D,
    cloth: CLOAK, clothD: CLOAK_D, trim: GOLD, iris: CLOAK, hairStyle: 'slick', mouth: 'smirk', brow: 'stern', extra: 'none',
  },
  hound: {
    bg: '#1a1424', edge: VIOLET_D, hair: VIOLET, hairD: VIOLET_D, skin: '#c2b0dc', skinD: VIOLET,
    cloth: VIOLET, clothD: VIOLET_D, trim: GOLD, iris: GOLD, hairStyle: 'wolf', mouth: 'flat', brow: 'stern', extra: 'none',
  },
  saint: {
    bg: '#241c12', edge: BRONZE_D, hair: BRONZE, hairD: BRONZE_D, skin: STONE, skinD: STONE_D,
    cloth: GOLD, clothD: GOLD_D, trim: METAL, iris: ENERGY, hairStyle: 'bell', mouth: 'flat', brow: 'normal', extra: 'armor',
  },
  stillness: {
    bg: '#16141c', edge: '#6d6880', hair: PALE, hairD: '#6d6880', skin: WALL, skinD: STONE,
    cloth: '#c8c2d4', clothD: '#6d6880', trim: GOLD, iris: OUT, hairStyle: 'clock', mouth: 'flat', brow: 'normal', extra: 'none',
  },
  npc: {
    bg: '#242018', edge: WOOD_D, hair: '#e0a050', hairD: WOOD, skin: SKIN, skinD: SKIN_D,
    cloth: '#7a4e32', clothD: WOOD_D, trim: WALL, iris: '#3a5f9a', hairStyle: 'tuft', mouth: 'smile', brow: 'normal', extra: 'freckles',
  },
}

function paintPortrait(pix: Pix, id: PortraitId, frame: number): string {
  const bust = BUSTS[id]
  if (bust.hairStyle === 'wolf') {
    paintWolfPortrait(pix, bust, frame)
    return bust.bg
  }
  if (bust.hairStyle === 'clock') {
    paintClockPortrait(pix, bust, frame)
    return bust.bg
  }
  if (id === 'saint') {
    paintSaintPortrait(pix, bust, frame)
    return bust.bg
  }
  paintHumanPortrait(pix, bust, frame)
  return bust.bg
}

function paintHumanPortrait(pix: Pix, b: Bust, frame: number): void {
  const blink = (frame & 1) === 1
  const hood = b.hairStyle === 'hood'
  const bell = b.hairStyle === 'bell'
  ball(pix, 24, 44, 20, 14, b.clothD, INK)
  ball(pix, 24, 42, 18, 12, b.cloth, b.clothD)
  if (b.extra === 'armor') {
    ball(pix, 10, 40, 8, 6, b.cloth, b.clothD)
    ball(pix, 38, 40, 8, 6, b.trim, b.clothD)
    pix.rect(16, 36, 16, 3, b.trim)
  }
  if (b.extra === 'apron') {
    meat(pix, 16, 36, 16, 12, WALL, '#d3c6a4')
    pix.rect(22, 34, 4, 6, b.clothD)
  }
  meat(pix, 20, 30, 8, 8, b.skinD, b.skinD)
  pix.rect(21, 30, 5, 6, b.skin)
  const rx = b.hairStyle === 'bald' ? 13 : 12
  ball(pix, 25, 22, rx, 13, b.skin, b.skinD, SKIN_HI)
  if (!hood && !bell) {
    ball(pix, 12, 23, 2.2, 3, b.skinD, b.skinD)
    ball(pix, 37, 23, 2.2, 3, b.skin, b.skinD)
  }
  if (b.hairStyle === 'bald') {
    pix.ellipse(24, 28, 8, 4, b.skinD)
    pix.rect(24, 30, 6, 3, b.skin)
  }
  portraitHair(pix, b)
  if (b.extra === 'scarf') {
    pix.rect(12, 26, 24, 8, b.trim)
    pix.rect(14, 26, 20, 2, RUST)
    brow(pix, 15, 16, b.brow, true)
    brow(pix, 28, 16, b.brow, false)
    if (blink) {
      pix.rect(15, 21, 5, 1, OUT)
      pix.rect(28, 21, 5, 1, OUT)
    } else {
      pix.rect(15, 19, 5, 4, WHITE)
      pix.rect(28, 19, 5, 4, WHITE)
      pix.rect(17, 20, 2, 2, b.iris)
      pix.rect(30, 20, 2, 2, b.iris)
      pix.p(17, 20, OUT)
      pix.p(30, 20, OUT)
      pix.p(16, 20, WHITE)
      pix.p(29, 20, WHITE)
    }
    return
  }
  portraitFace(pix, b, blink)
  if (b.extra === 'bow') {
    pix.p(10, 16, HAIR_RED)
    pix.rect(8, 15, 3, 3, HAIR_RED)
    pix.rect(12, 15, 3, 3, HAIR_RED_D)
    pix.p(11, 16, GOLD)
  }
  if (b.extra === 'chain') pix.rect(18, 34, 12, 2, GOLD)
  if (b.extra === 'freckles') {
    pix.p(18, 26, '#c4846a')
    pix.p(30, 25, '#c4846a')
    pix.p(20, 28, '#c4846a')
  }
  if (b.extra === 'apron') {
    pix.rect(18, 24, 8, 2, b.hairD)
    pix.rect(22, 26, 5, 1, b.hair)
  }
}

function portraitHair(pix: Pix, b: Bust): void {
  const h = b.hair
  const d = b.hairD
  switch (b.hairStyle) {
    case 'spike':
      pix.rect(16, 4, 3, 6, d)
      pix.rect(22, 2, 4, 8, h)
      pix.rect(28, 5, 3, 5, d)
      pix.rect(14, 8, 20, 6, h)
      pix.rect(12, 12, 6, 10, d)
      pix.rect(30, 12, 5, 8, h)
      break
    case 'long':
      pix.rect(12, 8, 24, 6, h)
      pix.rect(8, 12, 8, 22, d)
      pix.rect(10, 14, 5, 18, h)
      pix.rect(32, 12, 7, 16, d)
      pix.rect(14, 6, 8, 4, h)
      break
    case 'short':
      pix.rect(13, 8, 22, 6, h)
      pix.rect(16, 6, 10, 3, d)
      pix.rect(12, 12, 5, 6, d)
      break
    case 'bald':
      pix.rect(10, 16, 6, 10, h)
      pix.rect(32, 16, 6, 10, d)
      pix.rect(12, 12, 4, 4, h)
      pix.rect(32, 12, 4, 4, d)
      break
    case 'tuft':
      pix.rect(22, 4, 4, 6, h)
      pix.rect(14, 10, 20, 5, d)
      pix.rect(16, 8, 8, 3, h)
      break
    case 'slick':
      pix.rect(14, 8, 22, 5, h)
      pix.p(30, 6, d)
      pix.rect(16, 5, 8, 3, d)
      pix.rect(12, 12, 5, 8, d)
      break
    case 'hood':
      ball(pix, 24, 20, 16, 16, b.cloth, b.clothD)
      ball(pix, 24, 22, 10, 11, b.skin, b.skinD, SKIN_HI)
      pix.rect(14, 10, 6, 8, b.hairD)
      break
    case 'bell':
      bellShape(pix, 24, 1, 12, b.hair, b.hairD)
      break
    case 'messy':
    case 'wolf':
    case 'clock':
      break
    default:
      break
  }
}

function brow(pix: Pix, x: number, y: number, kind: Bust['brow'], left: boolean): void {
  const dir = left ? 1 : -1
  if (kind === 'stern') {
    pix.rect(x, y + 1, 5, 1, HAIR_BROWN_D)
    pix.p(x + dir * 4, y, HAIR_BROWN_D)
    return
  }
  if (kind === 'worried') {
    pix.rect(x, y, 5, 1, HAIR_BROWN_D)
    pix.p(x, y + 1, HAIR_BROWN_D)
    return
  }
  if (kind === 'soft') {
    pix.rect(x, y, 4, 1, HAIR_BROWN)
    return
  }
  pix.rect(x, y, 5, 1, HAIR_BROWN_D)
}

function portraitFace(pix: Pix, b: Bust, blink: boolean): void {
  brow(pix, 15, 16, b.brow, true)
  brow(pix, 28, 16, b.brow, false)
  const eye = (x: number) => {
    if (blink) {
      pix.rect(x, 21, 5, 1, OUT)
      return
    }
    pix.rect(x, 19, 5, 4, OUT)
    pix.rect(x + 1, 20, 3, 2, WHITE)
    pix.rect(x + 2, 20, 2, 2.2, b.iris)
    pix.p(x + 3, 21, OUT)
    pix.p(x + 1, 20, WHITE)
  }
  eye(15)
  eye(28)
  pix.rect(23, 24, 2, 3, b.skinD)
  pix.p(25, 26, b.skinD)
  const y = 29
  if (b.mouth === 'smile') {
    pix.p(19, y, HAIR_RED_D)
    pix.rect(20, y + 1, 8, 1.2, HAIR_RED)
    pix.p(28, y, HAIR_RED_D)
    pix.rect(22, y, 4, 1, '#e07a7a')
  } else if (b.mouth === 'frown') {
    pix.p(19, y + 1, HAIR_RED_D)
    pix.rect(20, y, 8, 1.2, HAIR_RED_D)
    pix.p(28, y + 1, HAIR_RED_D)
  } else if (b.mouth === 'smirk') {
    pix.rect(20, y, 5, 1.2, HAIR_RED_D)
    pix.p(25, y - 1, HAIR_RED)
    pix.p(27, y - 1, HAIR_RED_D)
  } else {
    pix.rect(20, y, 7, 1.2, HAIR_RED_D)
  }
  if (b.mouth === 'smile' || b.hairStyle === 'bald') {
    pix.p(16, 25, '#e7a898')
    pix.p(32, 25, '#e7a898')
  }
}

function paintWolfPortrait(pix: Pix, b: Bust, frame: number): void {
  ball(pix, 24, 44, 18, 12, b.clothD, INK)
  ball(pix, 24, 42, 16, 10, b.cloth, b.clothD)
  pix.rect(8, 6, 8, 16, b.hairD)
  pix.rect(32, 4 + (frame & 1), 8, 16, b.hair)
  pix.rect(10, 10, 4, 8, GOLD_D)
  pix.rect(34, 10, 4, 8, '#c2b0dc')
  ball(pix, 24, 24, 14, 12, b.hair, b.hairD)
  pix.ellipse(24, 30, 7, 5, b.skin)
  pix.p(24, 30, OUT)
  cracks(pix, 16, 18, GOLD)
  cracks(pix, 26, 16, GOLD)
  const blink = (frame & 1) === 1
  if (blink) {
    pix.rect(16, 22, 5, 1, OUT)
    pix.rect(28, 22, 5, 1, OUT)
  } else {
    pix.rect(15, 20, 6, 4, GOLD)
    pix.rect(28, 20, 6, 4, GOLD)
    pix.rect(17, 21, 2, 2.2, OUT)
    pix.rect(30, 21, 2.2, 2.2, OUT)
    pix.p(18, 21, WHITE)
    pix.p(31, 21, WHITE)
  }
  pix.rect(18, 32, 12, 2, INK)
}

function paintSaintPortrait(pix: Pix, b: Bust, frame: number): void {
  ball(pix, 24, 46, 20, 12, b.clothD, GOLD_D)
  ball(pix, 24, 44, 18, 10, b.cloth, b.clothD)
  meat(pix, 8, 34, 8, 8, METAL, METAL_D)
  meat(pix, 32, 34, 8, 8, METAL_D, STONE_D)
  bellShape(pix, 24, 2, 18, BRONZE, BRONZE_D)
  pix.rect(16, 22, 16, 6, INK)
  const gx = 18 + (frame & 1)
  pix.rect(gx, 23, 3, 3, GOLD)
  pix.rect(28, 23, 3, 3, ENERGY)
  pix.p(gx, 23, WHITE)
  pix.rect(14, 36, 20, 2, METAL)
}

function paintClockPortrait(pix: Pix, b: Bust, frame: number): void {
  cloak(pix, 24, 30, 47, 8, 16, b.cloth, b.clothD)
  pix.rect(16, 34, 16, 3, b.trim)
  clockFace(pix, 24, 20, 12, frame)
  brokenHalo(pix, 24, 20, 16)
  pix.p(24, 44, GOLD)
}

const FONT: Record<string, number[]> = {
  a: [2, 5, 7, 5, 5], b: [6, 5, 6, 5, 6], c: [3, 4, 4, 4, 3], d: [3, 5, 5, 5, 3],
  e: [7, 4, 6, 4, 7], f: [3, 4, 6, 4, 4], g: [3, 5, 5, 5, 7], h: [5, 5, 7, 5, 5],
  i: [1, 0, 1, 1, 1], j: [1, 0, 1, 1, 2], k: [5, 5, 6, 5, 5], l: [4, 4, 4, 4, 7],
  m: [5, 7, 7, 5, 5], n: [5, 7, 5, 5, 5], o: [2, 5, 5, 5, 2], p: [6, 5, 6, 4, 4],
  q: [2, 5, 5, 7, 3], r: [6, 5, 6, 5, 5], s: [3, 4, 2, 1, 6], t: [7, 2, 2, 2, 2],
  u: [5, 5, 5, 5, 7], v: [5, 5, 5, 5, 2], w: [5, 5, 7, 7, 5], x: [5, 5, 2, 5, 5],
  y: [5, 5, 7, 1, 6], z: [7, 1, 2, 4, 7], '-': [0, 0, 7, 0, 0],
}

function tinyLabel(pix: Pix, label: string): void {
  const text = label.slice(0, 5)
  let x0 = 1
  for (const ch of text) {
    const rows = FONT[ch] ?? FONT['-']
    if (!rows) continue
    for (let y = 0; y < rows.length; y++) {
      const bits = rows[y] ?? 0
      for (let x = 0; x < 3; x++) {
        if (bits & (1 << (2 - x))) pix.p(x0 + x, 2 + y, WHITE)
      }
    }
    x0 += 4
  }
}

function missing(label: string, w: number, h: number): HTMLCanvasElement {
  const pix = new Pix(w, h)
  pix.rect(0, 0, w, h, '#ff00ff')
  pix.rect(1, 1, Math.max(1, w - 2), Math.max(1, h - 2), OUT)
  tinyLabel(pix, label)
  return pix.canvas
}

const cache = new Map<string, HTMLCanvasElement>()
const whiteCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

function spriteCanvas(id: SpriteId, side: boolean, facing: Facing, frame: number): HTMLCanvasElement {
  const key = `${side ? 'b' : 'f'}|${id}|${facing}|${frame}`
  const hit = cache.get(key)
  if (hit) return hit
  let canvas: HTMLCanvasElement
  if (side) {
    const [w, h] = battleSize(id)
    canvas = bake(w, h, (pix) => paintBattle(id, pix, frame))
  } else {
    canvas = bake(16, 16, (pix) => paintField(id, pix, facing, frame))
  }
  cache.set(key, canvas)
  return canvas
}

function portraitCanvas(id: PortraitId, frame: number): HTMLCanvasElement {
  const key = `p|${id}|${frame}`
  const hit = cache.get(key)
  if (hit) return hit
  const pix = new Pix(48, 48)
  const bg = paintPortrait(pix, id, frame)
  outline(pix.canvas)
  const ctx = pix.canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 48, 48)
    ctx.globalCompositeOperation = 'source-over'
    const bust = BUSTS[id]
    ctx.fillStyle = bust.edge
    ctx.fillRect(0, 0, 48, 1)
    ctx.fillRect(0, 47, 48, 1)
    ctx.fillRect(0, 0, 1, 48)
    ctx.fillRect(47, 0, 1, 48)
  }
  cache.set(key, pix.canvas)
  return pix.canvas
}

function whiteOf(src: HTMLCanvasElement): HTMLCanvasElement {
  const cached = whiteCache.get(src)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  whiteCache.set(src, canvas)
  return canvas
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  y: number,
  opts?: { frame?: number; dir?: Dir; scale?: number; flash?: boolean; side?: boolean; flip?: boolean },
): void {
  const frame = (opts?.frame ?? 0) & 1
  const dir = opts?.dir ?? 'down'
  const scale = opts?.scale ?? 1
  const side = opts?.side ?? false
  const flip = side ? Boolean(opts?.flip) : dir === 'left' || Boolean(opts?.flip)
  const facing: Facing = side || dir === 'left' || dir === 'right' ? 'right' : dir
  const known = Boolean(HUMANS[id]) || isCreature(id)
  const canvas = known ? spriteCanvas(id, side, facing, frame) : missing(id, side ? 32 : 16, side ? 40 : 16)
  const dw = Math.round(canvas.width * scale)
  const dh = Math.round(canvas.height * scale)
  const bob = !side && frame === 1 ? -1 : 0
  const dx = Math.round(x - dw / 2)
  const dy = Math.round(y - dh) + bob
  blit(ctx, canvas, dx, dy, scale, flip)
  if (opts?.flash) {
    ctx.save()
    ctx.globalAlpha = 0.65
    blit(ctx, whiteOf(canvas), dx, dy, scale, flip)
    ctx.restore()
    ctx.imageSmoothingEnabled = false
  }
}

function isCreature(id: SpriteId): boolean {
  switch (id) {
    case 'gnatcoil':
    case 'briarhusk':
    case 'clockmite':
    case 'hound':
    case 'cindermote':
    case 'wisp':
    case 'saint':
    case 'wraith':
    case 'minute':
    case 'hour':
    case 'stillness':
    case 'chest':
    case 'chest-open':
    case 'bell':
      return true
    default:
      return false
  }
}

export function drawPortrait(ctx: CanvasRenderingContext2D, id: PortraitId, frame?: number): void {
  const src = BUSTS[id] ? portraitCanvas(id, (frame ?? 0) & 1) : missing(id, 48, 48)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = false
}
