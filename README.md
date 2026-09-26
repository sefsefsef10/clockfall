# Clockfall

A short time-travel RPG in the browser. The fair at Leorain is still open. The second hand is not.

You walk the map, meet enemies where you can see them, and fight on a time bar. Two characters with full bars can spend them together. Three can stop a clock. If a turn goes wrong, the Echo Lens rewinds it.

## Play locally

```bash
npm install
npm run dev
```

Vite serves the game on port **41777**.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys or WASD | Pad |
| Run | Hold Shift | Run button |
| Confirm / talk | Z, Enter, or Space | Confirm |
| Back | X or Backspace | Back |
| Menu | Esc or M | Menu |
| Rewind a battle action | R | Rewind button |

Crystals save and restore the party. The inn in Leorain does the same for a few marks. If a fight ends you, play resumes from the last crystal or the last map you entered.

In Settings you can switch Wait and Active time, and speed the bars up. Wait pauses them while you choose.

## The road

Leorain, the Clockwood, Ashspire, the Rust Cathedral, Crownkeep, and the Sunken Dial. One story, through to the ending.

## A place for the rain

An optional story links the same garden across three ages. Hear Iona's wish in
Ashspire, plant a rainroot in Crownkeep, and return to see what survived. Leorain
remembers the tree, too. Completing the story grants the Verdant Mantle and a
third Echo. The pause menu's **Chronicle** tracks the main story and this quest.

Enemy windups now show their progress, the battle menu identifies whose turn it
is, and Rewind is available by touch. Rewind restores items, discoveries, and
the random sequence along with health and status effects.

## Verify

Use Node.js 22.18 or later (native TypeScript stripping is required for tests).

```bash
npm ci
npm test
npm run build
npm run preview
```

The regression suite checks rewind rollback, saved-game validation, quest
reachability, reward gating, and the campaign's content references.
