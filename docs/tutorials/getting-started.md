# Getting started

In this tutorial you install @seneca/mem-store, save and query a few
entities, and look inside the store. It takes about ten minutes. The
finished program is
[docs/examples/getting-started.js](../examples/getting-started.js).

## 1. Install

Seneca 4 needs Node.js 22 or later (24 is recommended). In a new
directory:

```sh
npm init -y
npm install seneca seneca-entity @seneca/mem-store
```

seneca-entity provides the entity API (`seneca.entity`, `save$`,
`load$`, `list$`, `remove$`); @seneca/mem-store is the store that keeps
the data. seneca-entity depends on seneca-mem-store and loads it by
default, so the explicit install only pins the version.

## 2. Save and load an entity

Create `fruit.js`:

```js
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' }).use('entity')

  await new Promise((resolve) => seneca.ready(resolve))

  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'apple', price: 0.99 })
    .save$()
  console.log('saved:', apple.toString())

  const loaded = await seneca.entity('fruit').load$(apple.id)
  console.log('loaded:', loaded.data$(false))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Run it with `node fruit.js`:

```
saved: $-/-/fruit;id=gwqe17;{name:apple,price:0.99}
loaded: { name: 'apple', price: 0.99, id: 'gwqe17' }
```

(The id is random, so yours differs.) What happened:

* `seneca.use('entity')` loaded seneca-entity, which loaded mem-store
  because its `mem_store` option defaults to `true`. To pass options to
  mem-store, load it yourself instead:
  `seneca.use('entity', { mem_store: false }).use('mem-store', { merge: false })`.
* `seneca.ready(callback)` waits until both plugins have loaded. The
  callback form works on Seneca 3, on Seneca 4 and on the 4.0.0
  prerelease.
* `seneca.entity('fruit')` made an entity of name `fruit`. Entities
  have a canon of up to three parts, zone, base and name;
  `'-/-/fruit'` in the output means zone and base are not set.
* `data$` set fields and `save$` sent a `sys:entity,cmd:save` message.
  mem-store answered it: the entity had no `id`, so the store generated
  a six character id, stored a copy of the fields, and replied with a
  new entity carrying the id.
* `load$(id)` sent `sys:entity,cmd:load` and got the stored copy back.
  `data$(false)` returns the fields as a plain object without the
  `entity$` canon.

The example in the repository,
[getting-started.js](../examples/getting-started.js), loads the plugin
with `.use('entity', { mem_store: false }).use(require('../..'))` so that
it exercises the local build. Everything else is the same.

## 3. Update

An entity that has an `id` is updated when saved:

```js
loaded.price = 1.25
await loaded.save$()
const again = await seneca.entity('fruit').load$(apple.id)
console.log('after update:', again.price) // after update: 1.25
```

By default the stored record is merged with the saved fields, so fields
that the saved entity does not carry are kept. See
[Control merge versus replace on save](../how-to/control-merge-versus-replace-on-save.md).

## 4. Query

`list$` takes a query object. Plain values must be equal; objects with
`$` keys are comparisons; `sort$`, `skip$` and `limit$` order and page
the result:

```js
await seneca.entity('fruit').data$({ name: 'pear', price: 1.5 }).save$()
await seneca.entity('fruit').data$({ name: 'kiwi', price: 0.5 }).save$()

const cheap = await seneca
  .entity('fruit')
  .list$({ price: { $lt: 1.3 }, sort$: { price: 1 } })
console.log('cheap:', cheap.map((f) => f.name + ' ' + f.price))
// cheap: [ 'kiwi 0.5', 'apple 1.25' ]
```

The full list of supported query features, and the ones that are not
supported, is in the [Query reference](../reference/query.md).

## 5. Remove and inspect

```js
await seneca.entity('fruit').remove$(apple.id)
const all = await seneca.entity('fruit').list$()
console.log('remaining:', all.map((f) => f.name))
// remaining: [ 'pear', 'kiwi' ]

const dump = await seneca.post('role:mem-store,cmd:dump')
console.log('dump:', JSON.stringify(dump))
```

```
dump: {"undefined":{"fruit":{"u3uoy6":{"entity$":"-/-/fruit","name":"pear","price":1.5,"id":"u3uoy6"},"nlyk9u":{"entity$":"-/-/fruit","name":"kiwi","price":0.5,"id":"nlyk9u"}}}}
```

`role:mem-store,cmd:dump` returns the store itself: a plain object keyed
by base, then name, then id. Entities without a base are filed under
the key `undefined`. Each record is the saved data plus an `entity$`
string with the canon. `cmd:export` returns the same as a JSON string,
and `cmd:import` loads one; see
[Seed and inspect data with import and export](../how-to/seed-and-inspect-data-with-import-and-export.md).

## 6. Where the data goes

The store is a JavaScript object inside the plugin. It lives as long as
the Seneca instance, in that process only. Nothing is written to disk,
and a new instance starts empty. That is the point of mem-store: it is
the store for development, prototypes and tests. How it fits the
seneca-entity store protocol, and what that implies, is explained in
[How mem-store works](../explanation/how-mem-store-works.md).

## Complete output

Running `node docs/examples/getting-started.js` in this repository
prints (ids vary):

```
saved: $-/-/fruit;id=gwqe17;{name:apple,price:0.99}
loaded: { name: 'apple', price: 0.99, id: 'gwqe17' }
after update: 1.25
cheap: [ 'kiwi 0.5', 'apple 1.25' ]
remaining: [ 'pear', 'kiwi' ]
dump: {"undefined":{"fruit":{"u3uoy6":{"entity$":"-/-/fruit","name":"pear","price":1.5,"id":"u3uoy6"},"nlyk9u":{"entity$":"-/-/fruit","name":"kiwi","price":0.5,"id":"nlyk9u"}}}}
```

## Next steps

* [Use mem-store as the test store for a plugin](../how-to/use-mem-store-as-the-test-store-for-a-plugin.md)
* [Query, sort and page entity lists](../how-to/query-sort-and-page-entity-lists.md)
* [Options reference](../reference/options.md) and
  [Messages reference](../reference/messages.md)
