# Messages reference

Every action pattern that mem-store answers, with the message fields it
reads, what it replies, and the errors it can produce. The store
actions are registered through seneca-entity; the plugin actions are
mem-store's own.

Patterns on Seneca 4, as listed by `seneca.list()`:

```
sys:entity,cmd:save
sys:entity,cmd:load
sys:entity,cmd:list
sys:entity,cmd:remove
sys:entity,cmd:native
role:mem-store,cmd:dump
role:mem-store,cmd:export
role:mem-store,cmd:import
```

With a non-empty `map` option the store patterns also carry the canon
fields `name`, `base` and `zone`, and only the mapped commands are
registered (see [Options: map](options.md)). seneca-entity translates
`role:entity,cmd:<cmd>` messages to `sys:entity`; Seneca 3 also lists
those `role:entity` patterns.

## Store actions

You normally send these through the entity API:

| Entity method | Message |
| ------------- | ------- |
| `ent.save$([directives])` | `sys:entity,cmd:save` with `ent`, `q` |
| `ent.load$(idOrQuery)` | `sys:entity,cmd:load` with `q`, `qent` |
| `ent.list$([query])` | `sys:entity,cmd:list` with `q`, `qent` |
| `ent.remove$(idOrQuery)` | `sys:entity,cmd:remove` with `q`, `qent` |
| `ent.native$()` | `sys:entity,cmd:native` |

Every store message carries the canon of the entity as `name`, `base`
and `zone` (each `undefined` when not set). Messages can also be sent
directly, for example `seneca.post('sys:entity,cmd:save', { name: 'foo', ent: { x: 1 } })`:
a plain object `ent` is turned into an entity, and for the other
commands a missing `q` is built from `id` when present.

Entities in replies are new objects. The reply of `save$` is a deep
copy of the stored record. The entities replied by `load$`, `list$` and
`remove$` copy the record's top level fields, but their nested objects
and arrays are the stored ones (see
[API: store object layout](api.md#store-object-layout)).

### save

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `ent` | entity | The entity to store. Fields whose name ends in `$` are not stored, except that the canon is stored as the string `entity$`. |
| `ent.id` | string | When set, the record with this id is updated. When no such record exists it is created with this id. |
| `ent.id$` | string | For a new entity (no `id`): the id to use. Removed from the entity. |
| `ent.merge$` | boolean | `false` replaces the stored record instead of merging. Not stored. |
| `q.upsert$` | string[] | For a new entity: fields that identify an existing record to update. See [Query: directives](query.md#directives). |

Behaviour:

1. Entity without `id`: if `q.upsert$` names fields that are all
   present in the entity and a record matches them, that record is
   updated and keeps its id. Otherwise the id is `id$`, or
   `generate_id(ent)`, and a new record is stored. An existing record
   with the `id$` value is an error.
2. Entity with `id`: the stored record is merged with the entity's
   fields, or replaced when the `merge` option or `merge$` is `false`.

Reply: the stored entity (a new entity object with the stored fields
and the `id`).

Errors: `entity-id-exists` (a record with the given `id$` exists),
`generate-invalid-entity-id` (`generate_id` returned `null` or
`undefined`). See [Error codes](errors.md).

Log: a debug entry `save/insert`, `save/update` or `save/upsert` with
the canon, the stored record and the store description
(`mem-store~1~-/-/-`).

### load

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `q` | object | Field conditions and directives, see [Query reference](query.md). An id string is turned into `{ id }` by seneca-entity. |
| `qent` | entity | The entity the query was made from; its canon selects the records and the results are entities of that canon. |

Reply: the first matching entity after `sort$`, `skip$`, `limit$` and
`fields$`, or `null`. An empty query is answered with `null` by
seneca-entity without sending the message.

Errors: none of its own.

### list

Same fields as load. Reply: an array of matching entities, possibly
empty.

### remove

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `q` | object | Field conditions and directives as for load. |
| `q.all$` | boolean | Remove every matching record. Default: only the first. |
| `q.load$` | boolean | Reply with the removed entity (only without `all$`). |
| `qent` | entity | As for load. |

Reply: the removed entity when `load$` is true and a record was
removed; otherwise `null`. Removing a record that does not exist is not
an error. An empty query is answered with `null` by seneca-entity
without sending the message.

Log: a debug entry `remove/one` or `remove/all` per removed record.

### native

No fields. Reply: the store object itself (base, name, id), the same
object that `role:mem-store,cmd:dump` returns. Changes to it change the
store.

### close

seneca-entity adds an action on `sys:seneca,cmd:close` (translated to
`role:seneca,cmd:close` on Seneca 3) that calls the store's `close`
command once and then continues the close chain. mem-store's `close`
only writes a debug log entry; there is no connection to release and
the data stays in memory until the process ends.

## Plugin actions

### dump

`role:mem-store,cmd:dump`. No fields. Reply: the store object (live,
not a copy). A debug tool; when several mem-store instances are loaded,
the instance loaded last answers. Use `native$()` on an entity to reach
a specific store.

### export

`role:mem-store,cmd:export`. No fields. Reply: `{ json: string }`, the
store serialized with `JSON.stringify`. Values that are not JSON
(`Date`, `undefined`, functions) are converted or dropped as
`JSON.stringify` does.

### import

`role:mem-store,cmd:import`.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `json` | string | Required. A JSON string in the store's shape: `{ [base]: { [name]: { [id]: record } } }`. |
| `merge` | boolean | `true`: deep merge the parsed object into the store (`seneca.util.deepextend`), keeping everything not mentioned. Default: replace the store object. |

Reply: `null`.

Errors: the `SyntaxError` from `JSON.parse` when `json` is missing or
not valid JSON. It has no Seneca error code.

A replacing import installs a new store object. References obtained
earlier through `dump`, `native` or `seneca.export('mem-store/native')`
then point at the old object; see [API: exports](api.md#plugin-exports).
