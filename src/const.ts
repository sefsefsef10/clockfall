/** Shared constants. Do not add gameplay data here. */

export const TILE = 16
export const VIEW_W = 480
export const VIEW_H = 270

/** Every map row may use only these characters. */
export const ALLOWED_TILES = '#.,ptwbfd=~amrsc^kg|o'

/** Impassable tiles. Everything else in ALLOWED_TILES is walkable. */
export const SOLID_TILES = '#tw=|o'

export const WALK_SPEED = 56
export const RUN_SPEED = 96

export const SAVE_KEY = 'clockfall-save-v1'
export const AUTO_KEY = 'clockfall-auto-v1'
