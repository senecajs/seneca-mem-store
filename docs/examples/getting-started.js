// Getting started with @seneca/mem-store.
//
// In your own project `seneca.use('entity')` loads mem-store automatically.
// This file loads the plugin from this repository instead, so that the
// example exercises the local build.
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' })
    .use('entity', { mem_store: false })
    .use(require('../..'))

  // Wait until the plugins have loaded. The callback form of ready also
  // works on Seneca 3 and on the Seneca 4 prerelease.
  await new Promise((resolve) => seneca.ready(resolve))

  // Create an entity and save it. The store generates the id.
  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'apple', price: 0.99 })
    .save$()
  console.log('saved:', apple.toString())

  // Load it back by id.
  const loaded = await seneca.entity('fruit').load$(apple.id)
  console.log('loaded:', loaded.data$(false))

  // Saving an entity that has an id updates the stored record.
  loaded.price = 1.25
  await loaded.save$()
  const again = await seneca.entity('fruit').load$(apple.id)
  console.log('after update:', again.price)

  // Save a few more and query the list.
  await seneca.entity('fruit').data$({ name: 'pear', price: 1.5 }).save$()
  await seneca.entity('fruit').data$({ name: 'kiwi', price: 0.5 }).save$()

  const cheap = await seneca
    .entity('fruit')
    .list$({ price: { $lt: 1.3 }, sort$: { price: 1 } })
  console.log('cheap:', cheap.map((f) => f.name + ' ' + f.price))

  // Remove one entity by id.
  await seneca.entity('fruit').remove$(apple.id)
  const all = await seneca.entity('fruit').list$()
  console.log('remaining:', all.map((f) => f.name))

  // Inspect everything the store holds.
  const dump = await seneca.post('role:mem-store,cmd:dump')
  console.log('dump:', JSON.stringify(dump))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
