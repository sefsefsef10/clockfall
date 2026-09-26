import type { MusicId, SfxId } from '../types.ts'

export interface AudioApi {
  unlock(): void
  /** 0..1. Music is scaled by 0.2. Effects use this value directly. */
  setVolume(v: number): void
  playMusic(id: MusicId): void
  stopMusic(): void
  sfx(id: SfxId): void
}

type Wave = OscillatorType

interface Tone {
  step: number
  midi: number
  len: number
  gain: number
  wave: Wave
}

interface Hat {
  step: number
  gain: number
  dur: number
  hp: number
}

interface Drone {
  midi: number
  wave: Wave
  gain: number
}

interface Tune {
  bpm: number
  /** Pattern length in sixteenth notes. */
  steps: number
  loop: boolean
  notes: Tone[]
  hats: Hat[]
  drones: Drone[]
}

interface Session {
  id: MusicId
  gain: GainNode
  timer: number
  drones: OscillatorNode[]
  stopped: boolean
}

const LOOKAHEAD = 0.1
const TICK_MS = 25
const FADE_SEC = 0.08

/** Town hook, also played slower as the ending. */
const TOWN_HOOK = [74, 71, 67, 69, 71, 74, 71, 67]
/** Clock pendulum: high, low, high, low. */
const TITLE_MOTIF = [72, 67, 76, 67, 74, 71, 72, 67]

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function line(wave: Wave, gain: number, rows: ReadonlyArray<readonly [number, number, number]>): Tone[] {
  const out: Tone[] = []
  for (const [step, midi, len] of rows) out.push({ step, midi, len, gain, wave })
  return out
}

function every(wave: Wave, gain: number, midi: number, to: number, stride: number, len: number): Tone[] {
  const out: Tone[] = []
  for (let step = 0; step < to; step += stride) out.push({ step, midi, len, gain, wave })
  return out
}

function fifths(wave: Wave, gain: number, root: number, fifth: number, to: number, stride: number, len: number): Tone[] {
  const out: Tone[] = []
  let high = false
  for (let step = 0; step < to; step += stride) {
    out.push({ step, midi: high ? fifth : root, len, gain, wave })
    high = !high
  }
  return out
}

function motif(wave: Wave, gain: number, midis: readonly number[], stride: number, len: number): Tone[] {
  const out: Tone[] = []
  for (let i = 0; i < midis.length; i++) {
    const midi = midis[i]
    if (midi === undefined) continue
    out.push({ step: i * stride, midi, len, gain, wave })
  }
  return out
}

function ticks(steps: readonly number[], gain: number, dur: number, hp: number): Hat[] {
  const out: Hat[] = []
  for (const step of steps) out.push({ step, gain, dur, hp })
  return out
}

function hatGrid(to: number, stride: number, gain: number, dur: number, hp: number): Hat[] {
  const out: Hat[] = []
  for (let step = 0; step < to; step += stride) out.push({ step, gain, dur, hp })
  return out
}

function checkMix(id: MusicId, tune: Tune): void {
  if (tune.steps <= 0) throw new Error(`${id} has no steps`)
  if (id === 'victory' && tune.loop) throw new Error('victory must not loop')
  if (id !== 'victory' && !tune.loop) throw new Error(`${id} must loop`)
  for (const note of tune.notes) {
    if (!(note.gain > 0) || note.len <= 0 || note.step < 0 || note.step + note.len > tune.steps) {
      throw new Error(`${id} has a note outside the pattern`)
    }
  }
  for (const hat of tune.hats) {
    if (hat.step < 0 || hat.step >= tune.steps) throw new Error(`${id} has a hat outside the pattern`)
  }
  for (const drone of tune.drones) {
    if (!(drone.gain > 0)) throw new Error(`${id} has a silent drone`)
  }
  for (let s = 0; s < tune.steps; s++) {
    let voices = tune.drones.length
    for (const note of tune.notes) {
      if (s >= note.step && s < note.step + note.len) voices += 1
    }
    if (voices > 3) throw new Error(`${id} step ${s} uses ${voices} voices`)
  }
}

const TUNES: Record<MusicId, Tune> = {
  title: {
    bpm: 72,
    steps: 32,
    loop: true,
    drones: [
      { midi: 48, wave: 'sine', gain: 0.11 },
      { midi: 55, wave: 'sine', gain: 0.07 },
    ],
    notes: motif('sine', 0.09, TITLE_MOTIF, 4, 3),
    hats: [
      ...ticks([4, 8, 12, 20, 24, 28], 0.03, 0.028, 5200),
      ...ticks([0, 16], 0.06, 0.036, 3600),
    ],
  },
  town: {
    bpm: 108,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...line('triangle', 0.12, [
        [0, 43, 2],
        [2, 50, 2],
        [4, 47, 2],
        [6, 50, 2],
        [8, 43, 2],
        [10, 52, 2],
        [12, 50, 2],
        [14, 47, 2],
        [16, 43, 2],
        [18, 50, 2],
        [20, 47, 2],
        [22, 43, 2],
        [24, 45, 2],
        [26, 50, 2],
        [28, 43, 2],
        [30, 38, 2],
      ]),
      ...motif('sine', 0.08, TOWN_HOOK, 2, 2),
      ...line('sine', 0.075, [
        [16, 69, 2],
        [18, 71, 2],
        [20, 74, 2],
        [22, 71, 2],
        [24, 69, 2],
        [26, 67, 2],
        [28, 69, 2],
        [30, 67, 2],
      ]),
      ...line('triangle', 0.045, [
        [0, 59, 8],
        [8, 60, 8],
        [16, 59, 8],
        [24, 57, 8],
      ]),
    ],
    hats: ticks([2, 6, 10, 14, 18, 22, 26, 30], 0.022, 0.04, 7000),
  },
  woods: {
    bpm: 96,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...line('triangle', 0.13, [
        [0, 45, 4],
        [4, 48, 4],
        [8, 52, 4],
        [12, 55, 4],
        [16, 53, 4],
        [20, 52, 4],
        [24, 50, 4],
        [28, 48, 4],
      ]),
      ...line('sine', 0.07, [
        [0, 64, 4],
        [4, 67, 2],
        [6, 69, 2],
        [8, 72, 4],
        [12, 71, 2],
        [16, 69, 2],
        [18, 67, 2],
        [20, 64, 4],
        [24, 62, 2],
        [26, 64, 2],
        [28, 67, 4],
      ]),
      ...line('sine', 0.035, [
        [0, 57, 8],
        [8, 64, 8],
        [16, 60, 8],
        [24, 64, 8],
      ]),
    ],
    hats: ticks([4, 12, 20, 28], 0.018, 0.04, 4800),
  },
  future: {
    bpm: 112,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...every('sine', 0.11, 40, 32, 4, 2),
      ...fifths('square', 0.035, 64, 71, 32, 2, 1),
      ...line('sine', 0.06, [
        [0, 71, 8],
        [8, 69, 4],
        [12, 67, 4],
        [16, 76, 6],
        [22, 74, 4],
        [26, 71, 6],
      ]),
    ],
    hats: hatGrid(32, 2, 0.026, 0.018, 9800),
  },
  past: {
    bpm: 100,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...line('square', 0.07, [
        [0, 50, 2],
        [2, 50, 2],
        [4, 45, 2],
        [6, 48, 2],
        [8, 50, 2],
        [10, 53, 2],
        [12, 57, 2],
        [14, 48, 2],
        [16, 50, 2],
        [18, 50, 2],
        [20, 43, 2],
        [22, 45, 2],
        [24, 48, 2],
        [26, 50, 2],
        [28, 52, 2],
        [30, 48, 2],
      ]),
      ...line('square', 0.045, [
        [0, 62, 4],
        [4, 65, 4],
        [8, 69, 4],
        [12, 71, 4],
        [16, 69, 4],
        [20, 67, 4],
        [24, 65, 4],
        [28, 64, 4],
      ]),
      ...line('triangle', 0.04, [
        [0, 53, 8],
        [8, 57, 8],
        [16, 55, 8],
        [24, 52, 8],
      ]),
    ],
    hats: hatGrid(32, 4, 0.03, 0.03, 6400),
  },
  dial: {
    bpm: 60,
    steps: 32,
    loop: true,
    drones: [
      { midi: 36, wave: 'sine', gain: 0.16 },
      { midi: 42, wave: 'sine', gain: 0.03 },
    ],
    notes: line('sine', 0.045, [
      [2, 61, 1],
      [6, 60, 3],
      [11, 58, 1],
      [15, 60, 2],
      [19, 64, 1],
      [23, 61, 2],
      [28, 60, 3],
    ]),
    hats: [
      ...ticks([0, 8, 18], 0.05, 0.03, 1400),
      ...ticks([3, 7, 14, 22, 27], 0.03, 0.045, 900),
    ],
  },
  battle: {
    bpm: 132,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...every('square', 0.15, 45, 32, 4, 2),
      ...line('triangle', 0.06, [
        [0, 64, 1],
        [4, 60, 1],
        [8, 67, 1],
        [12, 64, 1],
        [16, 64, 1],
        [20, 60, 1],
        [24, 62, 1],
        [28, 64, 1],
      ]),
      ...line('square', 0.055, [
        [0, 69, 2],
        [2, 72, 2],
        [4, 76, 2],
        [6, 74, 2],
        [8, 72, 2],
        [10, 69, 2],
        [12, 71, 2],
        [14, 72, 2],
        [16, 76, 2],
        [18, 74, 2],
        [20, 72, 2],
        [22, 76, 2],
        [24, 69, 4],
        [28, 67, 2],
        [30, 69, 2],
      ]),
    ],
    hats: [
      ...ticks([2, 6, 10, 14, 18, 22, 26, 30], 0.035, 0.025, 8600),
      ...ticks([4, 12, 20, 28], 0.06, 0.04, 7200),
    ],
  },
  boss: {
    bpm: 66,
    steps: 32,
    loop: true,
    drones: [{ midi: 38, wave: 'sine', gain: 0.14 }],
    notes: [
      ...line('square', 0.12, [
        [0, 38, 2],
        [16, 38, 2],
      ]),
      ...line('triangle', 0.07, [
        [0, 62, 8],
        [8, 68, 4],
        [12, 67, 4],
        [16, 65, 4],
        [20, 63, 4],
        [24, 60, 4],
        [28, 62, 4],
      ]),
    ],
    hats: ticks([8, 24], 0.055, 0.12, 1600),
  },
  victory: {
    bpm: 120,
    steps: 32,
    loop: false,
    drones: [],
    notes: [
      ...line('triangle', 0.1, [
        [0, 55, 8],
        [8, 55, 8],
        [16, 50, 8],
        [24, 55, 8],
      ]),
      ...line('sine', 0.08, [
        [0, 67, 2],
        [2, 67, 2],
        [4, 71, 2],
        [6, 74, 2],
        [8, 79, 6],
        [14, 78, 2],
        [16, 79, 4],
        [20, 76, 4],
        [24, 74, 4],
        [28, 67, 4],
      ]),
      ...line('sine', 0.05, [
        [0, 62, 8],
        [8, 71, 4],
        [12, 72, 4],
        [16, 69, 8],
        [24, 71, 8],
      ]),
    ],
    hats: ticks([0, 4, 8, 16, 24], 0.04, 0.03, 8000),
  },
  ending: {
    bpm: 72,
    steps: 32,
    loop: true,
    drones: [],
    notes: [
      ...line('triangle', 0.1, [
        [0, 43, 16],
        [16, 38, 8],
        [24, 43, 8],
      ]),
      ...motif('sine', 0.075, TOWN_HOOK, 4, 4),
      ...line('sine', 0.04, [
        [0, 59, 16],
        [16, 57, 8],
        [24, 59, 8],
      ]),
    ],
    hats: ticks([0, 16], 0.02, 0.04, 5000),
  },
}

for (const key of Object.keys(TUNES) as MusicId[]) checkMix(key, TUNES[key])

function makeNoise(ac: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(ac.sampleRate))
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function noteEnv(ac: AudioContext, dest: AudioNode, t: number, dur: number, peak: number): { node: GainNode; stopAt: number } {
  const g = ac.createGain()
  const p = Math.max(0.0002, peak)
  const attackEnd = t + Math.min(0.018, Math.max(0.006, dur * 0.12))
  const release = Math.min(0.05, Math.max(0.016, dur * 0.22))
  let stopAt = t + Math.max(dur, attackEnd - t + release)
  let releaseStart = stopAt - release
  if (releaseStart < attackEnd + 0.004) {
    releaseStart = attackEnd + 0.004
    stopAt = releaseStart + release
  }
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(p, attackEnd)
  g.gain.setValueAtTime(p, releaseStart)
  g.gain.exponentialRampToValueAtTime(0.0001, stopAt)
  g.connect(dest)
  return { node: g, stopAt }
}

function playTone(ac: AudioContext, dest: AudioNode, t: number, midi: number, dur: number, wave: Wave, peak: number): void {
  const osc = ac.createOscillator()
  const env = noteEnv(ac, dest, t, dur, peak)
  osc.type = wave
  osc.frequency.setValueAtTime(midiToHz(midi), t)
  osc.connect(env.node)
  osc.start(t)
  osc.stop(env.stopAt + 0.02)
}

function decayTone(ac: AudioContext, dest: AudioNode, t: number, freq: number, dur: number, wave: Wave, peak: number): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(Math.max(30, freq), t)
  const attack = 0.004
  const d = Math.max(dur, attack + 0.012)
  const p = Math.max(0.0002, peak)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(p, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  osc.connect(g)
  g.connect(dest)
  osc.start(t)
  osc.stop(t + d + 0.02)
}

function slideTone(
  ac: AudioContext,
  dest: AudioNode,
  t: number,
  from: number,
  to: number,
  dur: number,
  wave: Wave,
  peak: number,
): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = wave
  const attack = 0.005
  const d = Math.max(dur, attack + 0.02)
  const p = Math.max(0.0002, peak)
  const startHz = Math.max(30, from)
  let endHz = Math.max(30, to)
  if (endHz === startHz) endHz = startHz * 1.01
  osc.frequency.setValueAtTime(startHz, t)
  osc.frequency.exponentialRampToValueAtTime(endHz, t + d)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(p, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  osc.connect(g)
  g.connect(dest)
  osc.start(t)
  osc.stop(t + d + 0.02)
}

function noiseHit(
  ac: AudioContext,
  buffer: AudioBuffer,
  dest: AudioNode,
  t: number,
  dur: number,
  peak: number,
  kind: BiquadFilterType,
  freq: number,
  q: number,
): void {
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  const g = ac.createGain()
  src.buffer = buffer
  filter.type = kind
  filter.frequency.setValueAtTime(Math.max(40, freq), t)
  filter.Q.value = q
  const d = Math.max(0.012, dur)
  g.gain.setValueAtTime(Math.max(0.0002, peak), t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  src.connect(filter)
  filter.connect(g)
  g.connect(dest)
  src.start(t)
  src.stop(t + d + 0.01)
}

function startDrone(ac: AudioContext, dest: AudioNode, midi: number, wave: Wave, peak: number, when: number): OscillatorNode {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(midiToHz(midi), when)
  const p = Math.max(0.0002, peak)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(p, when + 0.04)
  osc.connect(g)
  g.connect(dest)
  osc.start(when)
  return osc
}

function binByStep<T extends { step: number }>(items: readonly T[], steps: number): T[][] {
  const bins: T[][] = []
  for (let i = 0; i < steps; i++) bins.push([])
  for (const item of items) {
    const bin = bins[item.step]
    if (bin) bin.push(item)
  }
  return bins
}

function playSfx(id: SfxId, ac: AudioContext, dest: AudioNode, buffer: AudioBuffer, t: number): void {
  switch (id) {
    case 'cursor':
      decayTone(ac, dest, t, 1568, 0.05, 'sine', 0.11)
      return
    case 'confirm':
      decayTone(ac, dest, t, 523.25, 0.09, 'sine', 0.1)
      decayTone(ac, dest, t + 0.08, 783.99, 0.12, 'sine', 0.1)
      return
    case 'cancel':
      decayTone(ac, dest, t, 783.99, 0.08, 'sine', 0.1)
      decayTone(ac, dest, t + 0.07, 392, 0.13, 'sine', 0.1)
      return
    case 'hit':
      slideTone(ac, dest, t, 170, 60, 0.09, 'square', 0.14)
      noiseHit(ac, buffer, dest, t, 0.07, 0.12, 'bandpass', 320, 1.4)
      return
    case 'hurt':
      slideTone(ac, dest, t, 130, 48, 0.2, 'square', 0.12)
      return
    case 'heal':
      decayTone(ac, dest, t, midiToHz(67), 0.16, 'sine', 0.05)
      decayTone(ac, dest, t + 0.07, midiToHz(71), 0.16, 'sine', 0.05)
      decayTone(ac, dest, t + 0.14, midiToHz(74), 0.22, 'sine', 0.055)
      return
    case 'fire': {
      const sparks = [0, 0.028, 0.05, 0.09, 0.11, 0.15]
      const freqs = [1400, 900, 1800, 700, 1600, 1100]
      for (let i = 0; i < sparks.length; i++) {
        const at = sparks[i] ?? 0
        const freq = freqs[i] ?? 1000
        noiseHit(ac, buffer, dest, t + at, 0.045, 0.07, 'bandpass', freq, 3)
      }
      return
    }
    case 'ice':
      decayTone(ac, dest, t, 2093, 0.42, 'sine', 0.06)
      decayTone(ac, dest, t + 0.018, 3136, 0.36, 'sine', 0.045)
      return
    case 'volt':
      slideTone(ac, dest, t, 240, 3400, 0.09, 'sawtooth', 0.07)
      return
    case 'tech':
      decayTone(ac, dest, t, 1174.7, 0.07, 'triangle', 0.1)
      decayTone(ac, dest, t + 0.055, 1760, 0.11, 'triangle', 0.09)
      return
    case 'chest': {
      const chord = [72, 76, 79, 84]
      for (let i = 0; i < chord.length; i++) {
        decayTone(ac, dest, t + i * 0.052, midiToHz(chord[i] ?? 72), 0.12, 'sine', 0.08)
      }
      return
    }
    case 'gate': {
      const whoosh = [55, 62, 69, 76]
      for (let i = 0; i < whoosh.length; i++) {
        decayTone(ac, dest, t + i * 0.055, midiToHz(whoosh[i] ?? 55), 0.1, 'sawtooth', 0.045)
      }
      noiseHit(ac, buffer, dest, t, 0.26, 0.04, 'bandpass', 640, 0.6)
      return
    }
    case 'rewind':
      for (let i = 0; i < 5; i++) decayTone(ac, dest, t + i * 0.046, midiToHz(76 - i), 0.07, 'square', 0.055)
      return
    case 'level': {
      const arp = [60, 64, 67, 72]
      for (let i = 0; i < arp.length; i++) {
        decayTone(ac, dest, t + i * 0.09, midiToHz(arp[i] ?? 60), 0.18, 'triangle', 0.09)
      }
      return
    }
    case 'die':
      slideTone(ac, dest, t, 420, 36, 0.52, 'sine', 0.13)
      return
    case 'bell':
      decayTone(ac, dest, t, 660, 0.75, 'sine', 0.07)
      decayTone(ac, dest, t, 990, 0.75, 'sine', 0.05)
      return
    case 'guard':
      slideTone(ac, dest, t, 96, 42, 0.08, 'sine', 0.15)
      noiseHit(ac, buffer, dest, t, 0.05, 0.05, 'lowpass', 200, 0.7)
      return
    case 'click':
      noiseHit(ac, buffer, dest, t, 0.014, 0.08, 'highpass', 4200, 0.5)
      return
    default: {
      const never: never = id
      void never
    }
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

export function createAudio(): AudioApi {
  let ctx: AudioContext | null = null
  let musicGain: GainNode | null = null
  let sfxGain: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let volume = 1
  let queued: MusicId | null = null
  let currentId: MusicId | null = null
  let playing = false
  let session: Session | null = null
  let token = 0

  function boot(): boolean {
    if (ctx) return true
    const Ctor = globalThis.AudioContext
    if (!Ctor) return false
    let created: AudioContext | null = null
    try {
      created = new Ctor()
      const music = created.createGain()
      music.gain.value = volume * 0.2
      music.connect(created.destination)
      const sfxBus = created.createGain()
      sfxBus.gain.value = volume
      sfxBus.connect(created.destination)
      const buffer = makeNoise(created)
      ctx = created
      musicGain = music
      sfxGain = sfxBus
      noiseBuf = buffer
      return true
    } catch {
      if (created) {
        void created.close().catch(() => {})
      }
      ctx = null
      musicGain = null
      sfxGain = null
      noiseBuf = null
      return false
    }
  }

  function fade(s: Session): void {
    s.stopped = true
    clearInterval(s.timer)
    if (!ctx) return
    const now = ctx.currentTime
    const end = now + FADE_SEC
    try {
      const param = s.gain.gain
      param.cancelScheduledValues(now)
      param.setValueAtTime(param.value, now)
      param.linearRampToValueAtTime(0, end)
    } catch {
      try {
        s.gain.gain.value = 0
      } catch {
        /* ignore */
      }
    }
    for (const osc of s.drones) {
      try {
        osc.stop(end)
      } catch {
        /* ignore */
      }
    }
    const gain = s.gain
    setTimeout(() => {
      try {
        gain.disconnect()
      } catch {
        /* ignore */
      }
    }, FADE_SEC * 1000 + 40)
  }

  function begin(id: MusicId): void {
    if (!ctx || !musicGain || !noiseBuf) return
    if (session && session.id === id && !session.stopped) return
    const tune = TUNES[id]
    const stepSec = 60 / tune.bpm / 4
    if (!Number.isFinite(stepSec) || stepSec <= 0) return
    const previous = session
    const my = ++token
    if (previous) fade(previous)
    const ac = ctx
    const bus = musicGain
    const buffer = noiseBuf
    try {
      const track = ac.createGain()
      track.gain.value = 1
      track.connect(bus)
      const drones: OscillatorNode[] = []
      const t0 = ac.currentTime + 0.05
      for (const d of tune.drones) {
        try {
          drones.push(startDrone(ac, track, d.midi, d.wave, d.gain, t0))
        } catch {
          /* ignore */
        }
      }
      const noteBins = binByStep(tune.notes, tune.steps)
      const hatBins = binByStep(tune.hats, tune.steps)
      let step = 0
      let next = t0
      const timer = setInterval(() => {
        if (my !== token) {
          clearInterval(timer)
          return
        }
        try {
          const horizon = ac.currentTime + LOOKAHEAD
          if (next < ac.currentTime - 0.05) {
            const skip = Math.ceil((ac.currentTime - next) / stepSec)
            step += skip
            next += skip * stepSec
          }
          let spins = 0
          while (next < horizon && spins < 48) {
            spins += 1
            if (!tune.loop && step >= tune.steps) {
              clearInterval(timer)
              const waitMs = Math.max(0, (next - ac.currentTime) * 1000) + 40
              setTimeout(() => {
                if (my !== token) return
                for (const osc of drones) {
                  try {
                    osc.stop()
                  } catch {
                    /* ignore */
                  }
                }
                try {
                  track.disconnect()
                } catch {
                  /* ignore */
                }
                if (session && session.timer === timer) {
                  session.stopped = true
                  session = null
                  currentId = null
                  playing = false
                }
              }, waitMs)
              return
            }
            const look = tune.loop ? ((step % tune.steps) + tune.steps) % tune.steps : step
            const chord = noteBins[look]
            const percussion = hatBins[look]
            if (chord) {
              for (const note of chord) {
                try {
                  playTone(ac, track, next, note.midi, note.len * stepSec, note.wave, note.gain)
                } catch {
                  /* one bad note does not stall the clock */
                }
              }
            }
            if (percussion) {
              for (const hat of percussion) {
                try {
                  noiseHit(ac, buffer, track, next, hat.dur, hat.gain, 'highpass', hat.hp, 0.7)
                } catch {
                  /* ignore a single hat */
                }
              }
            }
            next += stepSec
            step += 1
          }
        } catch {
          /* keep scheduling on the next tick */
        }
      }, TICK_MS)
      session = { id, gain: track, timer, drones, stopped: false }
      currentId = id
      playing = true
    } catch {
      playing = false
      currentId = null
    }
  }

  function startQueued(id: MusicId): void {
    try {
      if (!ctx || ctx.state !== 'running') return
      if (queued !== id) return
      if (playing && currentId === id) {
        queued = null
        return
      }
      queued = null
      begin(id)
    } catch {
      /* ignore */
    }
  }

  return {
    unlock(): void {
      try {
        if (!boot()) return
        if (!ctx) return
        const ac = ctx
        const id = queued
        void ac.resume().then(() => {
          if (id) startQueued(id)
        }).catch(() => {})
        if (id) startQueued(id)
      } catch {
        /* autoplay or construction failed */
      }
    },
    setVolume(v: number): void {
      volume = clamp01(v)
      try {
        if (musicGain) musicGain.gain.value = volume * 0.2
        if (sfxGain) sfxGain.gain.value = volume
      } catch {
        /* ignore */
      }
    },
    playMusic(id: MusicId): void {
      if (playing && currentId === id) return
      queued = id
      if (!ctx) return
      try {
        const ac = ctx
        void ac.resume().then(() => startQueued(id)).catch(() => {})
        startQueued(id)
      } catch {
        /* ignore */
      }
    },
    stopMusic(): void {
      queued = null
      const previous = session
      token += 1
      session = null
      currentId = null
      playing = false
      if (previous) fade(previous)
    },
    sfx(id: SfxId): void {
      try {
        if (!ctx || !sfxGain || !noiseBuf) return
        if (ctx.state !== 'running') return
        playSfx(id, ctx, sfxGain, noiseBuf, ctx.currentTime)
      } catch {
        /* ignore */
      }
    },
  }
}
