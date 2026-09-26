/** Tiny integer pixel buffer. Sprites are baked once and blitted crisp. */

export class Pix {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly w: number
  private readonly h: number

  constructor(w: number, h: number) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, w | 0)
    canvas.height = Math.max(1, h | 0)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    ctx.imageSmoothingEnabled = false
    this.canvas = canvas
    this.ctx = ctx
    this.w = canvas.width
    this.h = canvas.height
  }

  /** Plot one pixel. Coordinates outside the buffer are ignored. */
  p(x: number, y: number, color: string): void {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(xi, yi, 1, 1)
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return
    let x0 = Math.floor(x)
    let y0 = Math.floor(y)
    let x1 = Math.floor(x + w)
    let y1 = Math.floor(y + h)
    if (x0 < 0) x0 = 0
    if (y0 < 0) y0 = 0
    if (x1 > this.w) x1 = this.w
    if (y1 > this.h) y1 = this.h
    if (x0 >= x1 || y0 >= y1) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    if (rx <= 0 || ry <= 0) return
    const x0 = Math.floor(cx - rx)
    const y0 = Math.floor(cy - ry)
    const x1 = Math.ceil(cx + rx)
    const y1 = Math.ceil(cy + ry)
    const rx2 = rx * rx
    const ry2 = ry * ry
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx
        const dy = y + 0.5 - cy
        if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1) this.p(x, y, color)
      }
    }
  }
}

/**
 * Draw `src` at an integer destination.
 * `flip` mirrors horizontally around the sprite center.
 * Image smoothing stays off.
 */
export function blit(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  dx: number,
  dy: number,
  scale: number,
  flip: boolean,
): void {
  ctx.imageSmoothingEnabled = false
  const dw = Math.max(1, Math.round(src.width * scale))
  const dh = Math.max(1, Math.round(src.height * scale))
  const x = Math.round(dx)
  const y = Math.round(dy)
  if (!flip) {
    ctx.drawImage(src, x, y, dw, dh)
    ctx.imageSmoothingEnabled = false
    return
  }
  const pivot = x + Math.round(dw / 2)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(pivot, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, -Math.round(dw / 2), y, dw, dh)
  ctx.restore()
  ctx.imageSmoothingEnabled = false
}
