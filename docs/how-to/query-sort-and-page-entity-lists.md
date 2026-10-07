# Query, sort and page entity lists

How to select, order and page entities with `list$`, and how to pick
one entity with `load$`. The program used here is
[docs/examples/query-sort-page.js](../examples/query-sort-page.js); every
feature and its limits are specified in the
[Query reference](../reference/query.md).

The examples use these records:

```js
const Product = seneca.entity('shop', 'product')
const rows = [
  { id$: 'p1', name: 'apple', price: 0.99, kind: 'fruit', tags: ['red'] },
  { id$: 'p2', name: 'pear', price: 1.5, kind: 'fruit', tags: ['green'] },
  { id$: 'p3', name: 'kiwi', price: 0.5, kind: 'fruit', tags: ['green'] },
  { id$: 'p4', name: 'leek', price: 2.25, kind: 'veg', tags: [] },
  { id$: 'p5', name: 'kale', price: 3, kind: 'veg', tags: ['green'] },
]
for (const row of rows) {
  await Product.make$().data$(row).save$()
}
```

## 1. Match fields

Plain values must be strictly equal (`===`). Several fields are
combined with AND:

```js
await Product.list$({ kind: 'fruit' })             // apple, pear, kiwi
await Product.list$({ kind: 'fruit', price: 1.5 }) // pear
```

An array value matches any of its elements:

```js
await Product.list$({ name: ['apple', 'kale'] })   // apple, kale
```

## 2. Compare values

An object value holds comparison constraints. Several constraints on
one field are combined with AND:

```js
await Product.list$({ price: { $gte: 1.5 } })          // pear, leek, kale
await Product.list$({ price: { $gte: 1, $lt: 3 } })    // pear, leek
await Product.list$({ kind: { $ne: 'veg' } })          // apple, pear, kiwi
await Product.list$({ name: { $in: ['pear', 'leek'] } }) // pear, leek
```

Supported: `$ne`, `$gte`, `$gt`, `$lt`, `$lte`, `$in`, `$nin`. Other
keys are ignored, so an object value with no supported key matches
every record.

## 3. Sort

`sort$` names a field and a direction, `1` ascending or `-1`
descending. Only the first key of `sort$` is used:

```js
await Product.list$({ sort$: { price: -1 } }) // kale, leek, pear, apple, kiwi
```

Values are compared with the JavaScript `<` operator, so sort fields
should hold values of one type. Records that compare equal stay in
insertion order.

## 4. Page

Sort first, then `skip$` and `limit$`:

```js
const page = (n) =>
  Product.list$({ sort$: { name: 1 }, skip$: n * 2, limit$: 2 })

await page(0) // apple, kale
await page(1) // kiwi, leek
await page(2) // pear
```

`skip$` must be greater than 0 to have an effect, and so must
`limit$`: `limit$: 0` does not return an empty list, it returns
everything.

## 5. Return fewer fields

`fields$` lists the fields to keep. `id` is always kept:

```js
const slim = await Product.list$({ kind: 'veg', fields$: ['name'] })
slim.map((p) => p.toString())
// [ '$-/shop/product;id=p4;{name:leek}', '$-/shop/product;id=p5;{name:kale}' ]
```

Only the returned entities are trimmed; the stored records are not
changed.

## 6. Pick one entity with `load$`

`load$` accepts the same query object and returns the first match, so
`sort$` chooses which one:

```js
const priciest = await Product.load$({ sort$: { price: -1 } })
priciest.name // kale
```

`load$(id)` is shorthand for `load$({ id })`. With no matching record
the result is `null`.

## What does not work

```js
await Product.list$({ price: '1.5' })   // [] : no type coercion
await Product.list$({ tags: 'green' })  // [] : arrays are not searched
```

There is also no OR between fields, no partial or regular expression
matching, and no nested path such as `'address.city'`. See
[Query reference: limits](../reference/query.md#limits).

## Complete output

```
fruit: [ 'apple', 'pear', 'kiwi' ]
fruit at 1.5: [ 'pear' ]
apple or kale: [ 'apple', 'kale' ]
price >= 1.5: [ 'pear', 'leek', 'kale' ]
1 <= price < 3: [ 'pear', 'leek' ]
not veg: [ 'apple', 'pear', 'kiwi' ]
$in: [ 'pear', 'leek' ]
by price desc: [ 'kale', 'leek', 'pear', 'apple', 'kiwi' ]
page 0: [ 'apple', 'kale' ]
page 1: [ 'kiwi', 'leek' ]
page 2: [ 'pear' ]
fields$: [
  '$-/shop/product;id=p4;{name:leek}',
  '$-/shop/product;id=p5;{name:kale}'
]
priciest: kale
price "1.5" (string): []
tags green: []
```
