# Store only some entities in memory

How to make mem-store handle only chosen entities or commands, and how
to run it next to another store (or a second mem-store). The program
used here is
[docs/examples/only-some-entities.js](../examples/only-some-entities.js).

## 1. Restrict the store with `map`

The `map` option lists entity canons and the commands the store
provides for each:

```js
const seneca = Seneca({ log: 'silent' })
  .use('entity', { mem_store: false })
  .use('mem-store', {
    map: {
      '-/shop/product': '*',
      '-/shop/order': ['load', 'list'],
    },
  })
```

A canon is written `zone/base/name`, `base/name` or `name`; `-` stands
for a part that is not set. The value is `'*'` for all commands or an
array drawn from `save`, `load`, `list`, `remove`, `native` and `close`.

The store then registers only the matching patterns, each carrying the
canon fields:

```
patterns: [
  'base:shop,cmd:save,name:product,sys:entity',
  'base:shop,cmd:load,name:product,sys:entity',
  'base:shop,cmd:load,name:order,sys:entity',
  'base:shop,cmd:list,name:product,sys:entity',
  'base:shop,cmd:list,name:order,sys:entity',
  'base:shop,cmd:remove,name:product,sys:entity',
  'base:shop,cmd:native,name:product,sys:entity'
]
```

Products work as usual. Orders can be loaded and listed, but saving one
has no matching action:

```js
await seneca.entity('shop', 'order').list$() // []
try {
  await seneca.entity('shop', 'order').data$({ item: 'apple' }).save$()
} catch (err) {
  console.log(err.code) // act_not_found
}
```

The same happens for any entity that is not in the map at all.

## 2. Run two stores side by side

Patterns with canon fields are more specific than the general
`sys:entity,cmd:save` pattern of a store without a map, so they win for
their entities. To add a second mem-store instance, load the plugin
again with a tag:

```js
const MemStore = require('@seneca/mem-store')

const seneca = Seneca({ log: 'silent' })
  .use('entity') // default mem-store for everything
  .use(
    { name: 'mem-store', tag: 'cache', define: MemStore },
    { map: { '-/shop/product': '*' } },
  )
```

On Seneca 3 write `init: MemStore` instead of `define: MemStore`. The
same arrangement works with any other store plugin in place of the
first mem-store, which is the usual case: a database for most entities
and memory for a few.

```
save patterns: [ 'base:shop,cmd:save,name:product,sys:entity', 'cmd:save,sys:entity' ]
```

Products now go to the `cache` instance and orders to the default one.

## 3. Reach the right store

`native$()` on an entity is routed like any other entity message, so it
returns the store object of the instance that handles that entity:

```js
await seneca.entity('shop', 'product').native$()
// {"shop":{"product":{"p1":{"entity$":"-/shop/product","name":"apple","id":"p1"}}}}
await seneca.entity('shop', 'order').native$()
// {"shop":{"order":{"o1":{"entity$":"-/shop/order","item":"apple","id":"o1"}}}}
```

The exports are tagged: `seneca.export('mem-store$cache/native')` is
the cache store. The untagged instance is tagged `1` by seneca-entity,
so it is also available as `seneca.export('mem-store$1/native')`.

The actions `role:mem-store,cmd:dump`, `cmd:export` and `cmd:import`
carry no tag. With two instances they are all answered by the one
loaded last:

```
dump: {"shop":{"product":{"p1":{"entity$":"-/shop/product","name":"apple","id":"p1"}}}}
```

## Complete output

```
patterns: [
  'base:shop,cmd:save,name:product,sys:entity',
  'base:shop,cmd:load,name:product,sys:entity',
  'base:shop,cmd:load,name:order,sys:entity',
  'base:shop,cmd:list,name:product,sys:entity',
  'base:shop,cmd:list,name:order,sys:entity',
  'base:shop,cmd:remove,name:product,sys:entity',
  'base:shop,cmd:native,name:product,sys:entity'
]
product saved: $-/shop/product;id=urw30p;{name:apple}
orders: []
order save failed: act_not_found
save patterns: [ 'base:shop,cmd:save,name:product,sys:entity', 'cmd:save,sys:entity' ]
cache store: {"shop":{"product":{"p1":{"entity$":"-/shop/product","name":"apple","id":"p1"}}}}
default store: {"shop":{"order":{"o1":{"entity$":"-/shop/order","item":"apple","id":"o1"}}}}
dump: {"shop":{"product":{"p1":{"entity$":"-/shop/product","name":"apple","id":"p1"}}}}
```
