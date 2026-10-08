// Store only some entities in memory with the map option, and run a
// second in-memory store next to the first one.
//
// Logging is off because the example provokes an expected error that
// Seneca would otherwise log.
const Seneca = require('seneca')

async function main() {
  // One store, restricted to two canons and, for orders, two commands.
  let seneca = Seneca({ log: 'silent' })
    .use('entity', { mem_store: false })
    .use(require('../..'), {
      map: {
        '-/shop/product': '*',
        '-/shop/order': ['load', 'list'],
      },
    })

  await new Promise((resolve) => seneca.ready(resolve))

  // Only the mapped patterns are registered.
  console.log('patterns:', seneca.list('sys:entity').map((p) => seneca.util.pattern(p)))

  const apple = await seneca
    .entity('shop', 'product')
    .data$({ name: 'apple' })
    .save$()
  console.log('product saved:', apple.toString())

  // Orders can be listed and loaded, but there is no action to save them.
  console.log('orders:', await seneca.entity('shop', 'order').list$())
  try {
    await seneca.entity('shop', 'order').data$({ item: 'apple' }).save$()
  } catch (err) {
    console.log('order save failed:', err.code)
  }

  await seneca.close()

  // Two stores: the default one for everything, and a tagged one that
  // takes over shop/product. The more specific pattern wins.
  seneca = Seneca({ log: 'silent' })
    .use('entity', { mem_store: false })
    .use(require('../..'))
    .use(
      { name: 'mem-store', tag: 'cache', define: require('../..') },
      { map: { '-/shop/product': '*' } },
    )

  await new Promise((resolve) => seneca.ready(resolve))

  console.log('save patterns:', seneca.list('sys:entity,cmd:save').map((p) => seneca.util.pattern(p)))

  await seneca.entity('shop', 'product').data$({ id$: 'p1', name: 'apple' }).save$()
  await seneca.entity('shop', 'order').data$({ id$: 'o1', item: 'apple' }).save$()

  // native$ returns the map of the store that handles the entity.
  console.log('cache store:', JSON.stringify(await seneca.entity('shop', 'product').native$()))
  console.log('default store:', JSON.stringify(await seneca.entity('shop', 'order').native$()))

  // The dump, export and import actions are not tag aware: the store
  // loaded last answers them.
  console.log('dump:', JSON.stringify(await seneca.post('role:mem-store,cmd:dump')))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
