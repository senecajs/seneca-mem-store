# Seed and inspect data with import and export

How to load a known data set into mem-store, look at everything it
holds, and save its contents as JSON. The program used here is
[docs/examples/import-export.js](../examples/import-export.js); the
actions are specified in the [Messages reference](../reference/messages.md#plugin-actions).

## 1. Shape the data like the store

The store is a plain object with three levels: base, name, id. Each
record is a plain object that must carry its `id`. Entities without a
base are filed under the key `"undefined"`:

```js
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
```

Records saved by the store also carry an `entity$` string such as
`'-/shop/product'`. You do not need it in seed data: the canon of the
entities you get back comes from the entity you query with.

## 2. Replace the store with the seed

```js
await seneca.post('role:mem-store,cmd:import', { json: JSON.stringify(seed) })

const products = await seneca.entity('shop', 'product').list$()
const tag = await seneca.entity('tag').load$('t1')
```

`json` is required and must be a JSON string. Without `merge`, the
import replaces everything the store held.

## 3. Export everything as JSON

```js
const exported = await seneca.post('role:mem-store,cmd:export')
console.log(exported.json)
```

```
{"shop":{"product":{"p1":{"id":"p1","name":"apple","price":0.99},"p2":{"id":"p2","name":"pear","price":1.5},"p3":{"entity$":"-/shop/product","name":"kiwi","price":0.5,"id":"p3"}}},"undefined":{"tag":{"t1":{"id":"t1","label":"fresh"}}}}
```

To keep a snapshot between runs, write the string to a file and import
it at startup:

```js
const Fs = require('fs')
Fs.writeFileSync('snapshot.json', exported.json)
// later
await seneca.post('role:mem-store,cmd:import', {
  json: Fs.readFileSync('snapshot.json', 'utf8'),
})
```

## 4. Merge more data in

With `merge: true` the imported object is deep merged into the store:
existing records keep the fields the import does not mention, new
records are added, and nothing is removed.

```js
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
```

```
after merge: [
  '$-/shop/product;id=p1;{price:1.09,name:apple}',
  '$-/shop/product;id=p2;{name:pear,price:1.5}',
  '$-/shop/product;id=p3;{name:kiwi,price:0.5}',
  '$-/shop/product;id=p4;{name:plum,price:2}'
]
```

## 5. Look at the live store

`role:mem-store,cmd:dump` replies with the store object itself, not a
copy:

```js
const dump = await seneca.post('role:mem-store,cmd:dump')
console.log(Object.keys(dump.undefined.tag)) // [ 't1' ]
```

Changing that object changes the store. The same object is available
synchronously as `seneca.export('mem-store/native')`, and per entity
as `await seneca.entity('tag').native$()`.

## 6. Clear the store

```js
await seneca.post('role:mem-store,cmd:import', { json: '{}' })
```

## Things to know

* Export and import go through JSON. Values that are not JSON come back
  changed: a `Date` is exported as an ISO string and imported as a
  string, so a later query with a `Date` value does not match it.
* A replacing import swaps the store object. A `dump` result or
  `seneca.export('mem-store/native')` value obtained before the import
  still points at the old object. Ask again after importing.
* Invalid JSON is reported as the `SyntaxError` thrown by `JSON.parse`;
  it has no Seneca error code.
* When several mem-store instances are loaded, `dump`, `export` and
  `import` are answered by the instance loaded last. Use `native$()` on
  an entity to reach the store that handles it; see
  [Store only some entities in memory](store-only-some-entities-in-memory.md).

## Complete output

```
products: [
  '$-/shop/product;id=p1;{name:apple,price:0.99}',
  '$-/shop/product;id=p2;{name:pear,price:1.5}'
]
tag: $-/-/tag;id=t1;{label:fresh}
export: {"shop":{"product":{"p1":{"id":"p1","name":"apple","price":0.99},"p2":{"id":"p2","name":"pear","price":1.5},"p3":{"entity$":"-/shop/product","name":"kiwi","price":0.5,"id":"p3"}}},"undefined":{"tag":{"t1":{"id":"t1","label":"fresh"}}}}
after merge: [
  '$-/shop/product;id=p1;{price:1.09,name:apple}',
  '$-/shop/product;id=p2;{name:pear,price:1.5}',
  '$-/shop/product;id=p3;{name:kiwi,price:0.5}',
  '$-/shop/product;id=p4;{name:plum,price:2}'
]
tags in dump: [ 't1' ]
after clear: 0
```
