import type { MenuModel, SaveData } from '../types.ts'

type Entry = MenuModel['rows'][number]

/** Chronicle is a view of saved facts, never another source of quest state. */
export function chronicleRows(save: SaveData): Entry[] {
  const flags = save.flags
  const rows: Entry[] = []
  const done = (id: string, label: string, detail: string): void => {
    if (flags[id]) rows.push({ id: `chronicle:${id}`, label: `✓ ${label}`, detail })
  }
  const now = (id: string, label: string, detail: string): void => {
    rows.push({ id: `chronicle:${id}`, label, detail })
  }

  done('intro_done', 'The fair lost a second', 'Mira joined Kael after the clock skipped at Leorain Fair.')
  done('bells_solved', 'A full day in the Clockwood', 'The bells rang dawn, noon, dusk, and the north path opened.')
  done('future_open', 'The path into ash', 'The hound fell. The clock gate in Leorain can reach Ashspire.')
  done('past_open', 'The Volt Bell', 'The cathedral bell opened the way to Crownkeep through a clock gate.')
  done('triple_ready', 'Three against the Stillness', 'Torin joined. The Sunken Dial can be reached north of Crownkeep.')
  if (save.cleared || flags.stillness_dead) {
    now('restored', 'The clock turns', 'The Stillness fell. The ages have their hours again.')
  } else if (flags.triple_ready) {
    now('dial', 'Enter the Sunken Dial', 'Go north from Crownkeep. The three of you can face the Stillness there.')
  } else if (flags.past_open) {
    now('crownkeep', 'Find Torin in Crownkeep', 'Use a clock gate to reach Crownkeep. Seek Torin in the south court.')
  } else if (flags.future_open) {
    now('ashspire', 'Wake the Volt Bell', 'Use the clock gate in Leorain to reach Ashspire. Find both fuses for the Rust Cathedral to the north.')
  } else if (flags.bells_solved) {
    now('hound', 'Follow the northern path', 'The Clockwood bells opened the way north. A hound guards the rift.')
  } else if (flags.intro_done) {
    now('bells', 'Find the Clockwood bells', 'Leave Leorain by the north road. Ring the bells in the order of a day.')
  } else {
    now('fair', 'The hour repeats', 'Find what shook Leorain Fair.')
  }

  if (flags.seed_claimed) {
    now('rainroot-done', 'A place for the rain · complete', 'A seed planted in Crownkeep became shelter in Ashspire. Iona gave you the Verdant Mantle and an echo.')
  } else if (flags.seed_seen) {
    now('rainroot-refuge', 'A place for the rain', 'The rainroot survived into Leorain. Return to Iona at the Ashspire refuge, west of the clock gate.')
  } else if (flags.seed_planted) {
    now('rainroot-present', 'A place for the rain', 'The gardener planted the rainroot in Crownkeep. Return to Iona at the Ashspire refuge, west of the clock gate. You can also visit its old branches in Leorain.')
  } else if (flags.seed_heard) {
    now('rainroot-past', 'A place for the rain', 'Iona needs shelter in Ashspire. Ask the gardener west of Crownkeep’s clock gate about a seed.')
  }
  rows.push({ id: 'back', label: 'Back' })
  return rows
}
