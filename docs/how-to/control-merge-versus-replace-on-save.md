# Control merge versus replace on save

How to decide what happens to fields that a saved entity does not
carry. The program used here is
[docs/examples/merge-versus-replace.js](../examples/merge-versus-replace.js).

## The rule

When `save$` updates a record that already exists, mem-store merges
unless either the plugin option `merge` is `false` or the entity has
`merge$` set to `false`:

| `merge` option | `merge$` on the entity | Result |
| -------------- | ---------------------- | ------ |
| `true` (default) | not set or `true` | Stored record is `Object.assign(stored, saved)`: fields the saved entity does not carry are kept. |
| `true` | `false` | Stored record is replaced by the saved fields. |
| `false` | any | Stored record is replaced by the saved fields. |

A new record (no stored record for the id) is simply stored, in either
mode. The reply of `save$` is the stored record, so it shows the
merged or replaced data.

## 1. Rely on the default merge

```js
await seneca
  .entity('user')
  .data$({ id$: 'u1', name: 'Alice', email: 'alice@example.com', role: 'admin' })
  .save$()

// A partial entity with the same id updates only the fields it carries.
await seneca.entity('user').data$({ id: 'u1', role: 'editor' }).save$()

const alice = await seneca.entity('user').load$('u1')
console.log(alice.data$(false))
// { name: 'Alice', email: 'alice@example.com', role: 'editor', id: 'u1' }
```

This also means that deleting a field from a loaded entity and saving
it does not delete the field from the store.

## 2. Replace one record with `merge$`

```js
const replacement = seneca.entity('user').data$({ id: 'u1', name: 'Alice' })
replacement.merge$ = false
await replacement.save$()

console.log((await seneca.entity('user').load$('u1')).data$(false))
// { id: 'u1', name: 'Alice' }
```

`merge$` can also be given through `data$({ ..., merge$: false })`. It
is a directive, not data: it is not stored and not present on the
entity that `save$` returns.

## 3. Make replace the default with the `merge` option

```js
const seneca = Seneca({ log: 'warn' })
  .use('entity', { mem_store: false })
  .use('mem-store', { merge: false })
```

or, keeping the default load through seneca-entity:

```js
const seneca = Seneca({ plugin: { 'mem-store': { merge: false } } }).use('entity')
```

Now every update replaces:

```js
await seneca.entity('user').data$({ id: 'u1', role: 'editor' }).save$()
console.log((await seneca.entity('user').load$('u1')).data$(false))
// { id: 'u1', role: 'editor' }
```

## Related

* To create a record with a fixed id use `id$`; saving a second new
  entity with the same `id$` fails with `entity-id-exists`, see
  [Error codes](../reference/errors.md).
* To update a record found by a field rather than by id, see
  [Update or insert with upsert](update-or-insert-with-upsert.md).

## Complete output

```
merge (default): { name: 'Alice', email: 'alice@example.com', role: 'editor', id: 'u1' }
merge$: false: { id: 'u1', name: 'Alice' }
merge: false option: { id: 'u1', role: 'editor' }
```
