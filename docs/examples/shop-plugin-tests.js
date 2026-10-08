// Use mem-store as the test store for a plugin that stores entities.
// Run with: node docs/examples/shop-plugin-tests.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Seneca = require('seneca')

// The plugin under test. It only talks to the entity API, so any store
// will do; in tests that store is mem-store.
function shop(options) {
  const seneca = this

  seneca.message('role:shop,cmd:order', async function (msg) {
    const order = await this.entity('shop', 'order')
      .data$({ item: msg.item, qty: msg.qty, status: 'new' })
      .save$()
    return { order: order.data$(false) }
  })

  seneca.message('role:shop,cmd:open-orders', async function (msg) {
    const list = await this.entity('shop', 'order').list$({
      status: 'new',
      sort$: { item: 1 },
    })
    return { orders: list.map((order) => order.data$(false)) }
  })
}

// One fresh Seneca instance per test: a new instance is a new empty store.
async function makeSeneca(seed) {
  const seneca = Seneca()
    .test()
    .use('entity', { mem_store: false })
    .use(require('../..'))
    .use(shop)

  await new Promise((resolve) => seneca.ready(resolve))

  if (seed) {
    await seneca.post('role:mem-store,cmd:import', { json: JSON.stringify(seed) })
  }

  return seneca
}

test('order saves an entity', async () => {
  const seneca = await makeSeneca()

  const out = await seneca.post('role:shop,cmd:order', { item: 'apple', qty: 2 })
  assert.equal(out.order.item, 'apple')
  assert.equal(typeof out.order.id, 'string')

  const stored = await seneca.entity('shop', 'order').load$(out.order.id)
  assert.equal(stored.status, 'new')

  await seneca.close()
})

test('open-orders lists seeded orders in item order', async () => {
  const seneca = await makeSeneca({
    shop: {
      order: {
        o1: { id: 'o1', item: 'pear', qty: 1, status: 'new' },
        o2: { id: 'o2', item: 'apple', qty: 3, status: 'shipped' },
        o3: { id: 'o3', item: 'kiwi', qty: 5, status: 'new' },
      },
    },
  })

  const out = await seneca.post('role:shop,cmd:open-orders')
  assert.deepEqual(
    out.orders.map((order) => order.item),
    ['kiwi', 'pear'],
  )

  await seneca.close()
})

test('the store can be inspected and reset', async () => {
  const seneca = await makeSeneca()

  await seneca.post('role:shop,cmd:order', { item: 'leek', qty: 1 })
  let dump = await seneca.post('role:mem-store,cmd:dump')
  assert.equal(Object.keys(dump.shop.order).length, 1)

  // Reset between scenarios without creating a new instance.
  await seneca.post('role:mem-store,cmd:import', { json: '{}' })
  dump = await seneca.post('role:mem-store,cmd:dump')
  assert.deepEqual(dump, {})

  await seneca.close()
})
