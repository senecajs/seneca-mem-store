// Update or insert with the upsert$ directive.
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' })
    .use('entity', { mem_store: false })
    .use(require('../..'))

  await new Promise((resolve) => seneca.ready(resolve))

  const Player = seneca.entity('game', 'player')

  const alice = await Player.make$().data$({ username: 'alice', points: 1 }).save$()
  console.log('inserted:', alice.toString())

  // A new entity (no id) with upsert$: the stored record whose username
  // matches is updated and keeps its id.
  const again = await Player.make$()
    .data$({ username: 'alice', points: 5 })
    .save$({ upsert$: ['username'] })
  console.log('upserted:', again.toString(), 'same id:', again.id === alice.id)

  // No match: an ordinary insert.
  const bob = await Player.make$()
    .data$({ username: 'bob', points: 2 })
    .save$({ upsert$: ['username'] })
  console.log('inserted:', bob.toString())

  // Missing match field: an ordinary insert as well.
  const nobody = await Player.make$().data$({ points: 9 }).save$({ upsert$: ['username'] })
  console.log('inserted:', nobody.toString())

  const all = await Player.list$({ sort$: { points: -1 } })
  console.log('players:', all.map((p) => p.data$(false)))

  // The import action replies with no data.
  console.log('import reply:', await seneca.post('role:mem-store,cmd:import', { json: '{}' }))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
