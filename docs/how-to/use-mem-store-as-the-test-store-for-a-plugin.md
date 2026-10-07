# Use mem-store as the test store for a plugin

How to test a plugin that reads and writes entities, quickly and in
isolation, with mem-store as the database. The complete test file is
[docs/examples/shop-plugin-tests.js](../examples/shop-plugin-tests.js);
run it with `node docs/examples/shop-plugin-tests.js`. It uses the
Node.js test runner, but nothing here depends on it.

## 1. Write the plugin against the entity API only

```js
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
```

The plugin never names a store. Which store answers the entity
messages is decided by the plugins loaded next to it.

## 2. Build one instance per test

```js
async function makeSeneca(seed) {
  const seneca = Seneca()
    .test()
    .use('entity')
    .use(shop)

  await new Promise((resolve) => seneca.ready(resolve))

  if (seed) {
    await seneca.post('role:mem-store,cmd:import', { json: JSON.stringify(seed) })
  }

  return seneca
}
```

* `seneca.use('entity')` loads mem-store by default. If your production
  configuration loads another store plugin, leave it out of the test
  instance; mem-store registers the same `sys:entity` patterns.
* A new instance is a new, empty store, so tests do not see each
  other's data.
* `seneca.test()` turns on test mode: readable logs at warn level and
  caller locations in errors.
* The repository example loads the plugin from the local build with
  `.use('entity', { mem_store: false }).use(require('../..'))`.

## 3. Seed what the test needs

Pass fixtures as the store object (base, name, id; see
[Seed and inspect data](seed-and-inspect-data-with-import-and-export.md)).
Give fixture records explicit ids so that assertions can refer to them:

```js
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
assert.deepEqual(out.orders.map((order) => order.item), ['kiwi', 'pear'])
```

## 4. Assert on what was stored

Use the entity API, or look at the whole store with `dump`:

```js
const out = await seneca.post('role:shop,cmd:order', { item: 'apple', qty: 2 })
const stored = await seneca.entity('shop', 'order').load$(out.order.id)
assert.equal(stored.status, 'new')

const dump = await seneca.post('role:mem-store,cmd:dump')
assert.equal(Object.keys(dump.shop.order).length, 1)
```

## 5. Reset without a new instance

```js
await seneca.post('role:mem-store,cmd:import', { json: '{}' })
```

## 6. Close every instance

```js
await seneca.close()
```

Otherwise the test process may not exit. The callback form
`seneca.close(done)` works on Seneca 3.

## Predictable ids

Generated ids are six random characters. When a test needs to know
ids in advance, either use `id$` when saving, or load mem-store
yourself with a `generate_id` function:

```js
let n = 0
const seneca = Seneca()
  .test()
  .use('entity', { mem_store: false })
  .use('mem-store', { generate_id: () => 'id' + n++ })
```

## Testing a store plugin

If what you are testing is itself a store plugin, use the shared
test suite from [seneca-store-test](https://github.com/senecajs/seneca-store-test),
as this repository does in [test/mem.test.js](../../test/mem.test.js).

## Output

```
✔ order saves an entity (294.36514ms)
✔ open-orders lists seeded orders in item order (266.082592ms)
✔ the store can be inspected and reset (258.204626ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 824.106767
```
