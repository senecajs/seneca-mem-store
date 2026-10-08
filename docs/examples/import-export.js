// Seed and inspect data with role:mem-store,cmd:import and cmd:export.
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' })
    .use('entity', { mem_store: false })
    .use(require('../..'))

  await new Promise((resolve) => seneca.ready(resolve))

  // The store is a map: base -> name -> id -> record. Entities without a
  // base live under the key "undefined".
  const seed = {
    shop: {
      product: {
        p1: { id: 'p1', name: 'apple', price: 0.99 },
        p2: { id: 'p2', name: 'pear', price: 1.5 },
      },
    },
    undefined: {
      tag: {
        t1: { id: 't1', label: 'fresh' },
      },
    },
  }

  // Replace the whole store with the seed data.
  await seneca.post('role:mem-store,cmd:import', { json: JSON.stringify(seed) })

  const products = await seneca.entity('shop', 'product').list$()
  console.log('products:', products.map((p) => p.toString()))

  const tag = await seneca.entity('tag').load$('t1')
  console.log('tag:', tag.toString())

  // Save something new, then export everything as a JSON string.
  await seneca
    .entity('shop', 'product')
    .data$({ id$: 'p3', name: 'kiwi', price: 0.5 })
    .save$()

  const exported = await seneca.post('role:mem-store,cmd:export')
  console.log('export:', exported.json)

  // Merge more data into the store: existing records are deep merged,
  // new records are added, everything else is kept.
  const more = {
    shop: {
      product: {
        p1: { id: 'p1', price: 1.09 },
        p4: { id: 'p4', name: 'plum', price: 2 },
      },
    },
  }
  await seneca.post('role:mem-store,cmd:import', {
    json: JSON.stringify(more),
    merge: true,
  })

  const merged = await seneca.entity('shop', 'product').list$({ sort$: { id: 1 } })
  console.log('after merge:', merged.map((p) => p.toString()))

  // The live map is available without serialization.
  const dump = await seneca.post('role:mem-store,cmd:dump')
  console.log('tags in dump:', Object.keys(dump.undefined.tag))

  // Clear the store by replacing it with an empty map.
  await seneca.post('role:mem-store,cmd:import', { json: '{}' })
  console.log('after clear:', (await seneca.entity('shop', 'product').list$()).length)

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
