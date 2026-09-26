import assert from 'node:assert/strict'
import test from 'node:test'
import type { BattleCreateOpts, BattleState, MemberState } from '../src/types.ts'
import { battleCommand, battleConfirm, createBattle, currentCommands, tickBattle } from '../src/systems/battle.ts'
import { makeMember } from '../src/systems/stats.ts'

function startBattle(party: MemberState[], inventory: Record<string, number> = {}): BattleState {
  const opts = {
    mode: 'wait',
    speed: 1,
    echoMax: 2,
    ambush: 'fair',
    bestiary: {},
    inventory,
  } satisfies BattleCreateOpts & { inventory: Record<string, number> }
  return createBattle(party, ['gnatcoil'], opts)
}

function selectActor(battle: BattleState, actorIndex = 0): void {
  const actor = battle.allies[actorIndex]
  assert.ok(actor)
  actor.atb = 100
  battle.actorUid = actor.uid
  battle.phase = 'command'
}

function finishResolve(battle: BattleState): void {
  for (let i = 0; battle.phase === 'resolve' && i < 20; i += 1) tickBattle(battle, 0.25)
  assert.notEqual(battle.phase, 'resolve', 'action should finish')
}

function attack(battle: BattleState): void {
  selectActor(battle)
  battleCommand(battle, 'attack')
  battleConfirm(battle)
  finishResolve(battle)
}

test('echo restores consumed items and party vitality from before the action', () => {
  const battle = startBattle([makeMember('kael')], { tonic: 1 })
  const ally = battle.allies[0]
  assert.ok(ally)
  ally.hp -= 10
  const beforeHp = ally.hp

  selectActor(battle)
  battleCommand(battle, 'open-item')
  battleCommand(battle, 'item:tonic')
  battleConfirm(battle)
  finishResolve(battle)

  assert.deepEqual(battle.consumed, ['tonic'])
  assert.ok(ally.hp > beforeHp)
  battleCommand(battle, 'echo')

  assert.equal(battle.allies[0]?.hp, beforeHp)
  assert.deepEqual(battle.consumed, [])
  selectActor(battle)
  battleCommand(battle, 'open-item')
  assert.ok(currentCommands(battle).some(row => row.id === 'item:tonic'), 'restored inventory should contain the tonic')
})

test('echo restores weakness discoveries made by Read', () => {
  const battle = startBattle([makeMember('mira')])

  selectActor(battle)
  battleCommand(battle, 'tech:read')
  battleConfirm(battle)
  finishResolve(battle)

  assert.ok(battle.discovered.length > 0, 'Read should discover an enemy weakness')
  battleCommand(battle, 'echo')

  assert.deepEqual(battle.discovered, [])
})

test('echo restores the random stream consumed by a hit', () => {
  const battle = startBattle([makeMember('kael')])
  const initialRng = battle.rng
  attack(battle)

  assert.notEqual(battle.rng, initialRng)
  battleCommand(battle, 'echo')

  assert.equal(battle.rng, initialRng)
})

test('echo restores statuses consumed by an action', () => {
  const battle = startBattle([makeMember('kael')])
  const ally = battle.allies[0]
  assert.ok(ally)
  ally.statuses.push({ id: 'protect', turns: 2 })

  selectActor(battle)
  battleCommand(battle, 'defend')
  assert.deepEqual(ally.statuses, [{ id: 'protect', turns: 1 }])
  battleCommand(battle, 'echo')

  assert.deepEqual(battle.allies[0]?.statuses, [{ id: 'protect', turns: 2 }])
})

test('echo rolls back victory rewards and reward RNG without duplicating settlement', () => {
  const battle = startBattle([makeMember('kael')])
  const enemy = battle.enemies[0]
  assert.ok(enemy)
  enemy.hp = 1
  const initialRng = battle.rng

  attack(battle)
  assert.equal(battle.phase, 'victory')
  const firstRewards = structuredClone(battle.rewards)
  assert.notEqual(battle.rng, initialRng)

  battleCommand(battle, 'echo')
  assert.equal(battle.phase, 'run')
  assert.equal(battle.enemies[0]?.hp, 1)
  assert.deepEqual(battle.rewards, { xp: 0, gold: 0, items: [], levels: [] })
  assert.equal(battle.rng, initialRng)

  attack(battle)
  assert.deepEqual(battle.rewards, firstRewards, 'replaying from the same RNG state should settle the same rewards')
})
