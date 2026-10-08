# How mem-store works

mem-store is the smallest possible implementation of a Seneca entity
store: a JavaScript object, a scan, and no persistence. This page
explains how it plugs into the seneca-entity store protocol, what that
protocol asks of a store, what mem-store keeps and loses, how Seneca 3
and Seneca 4 differ for it, and where its limits come from.

## The store protocol

seneca-entity defines the entity API (`seneca.entity`, `make$`,
`save$`, `load$`, `list$`, `remove$`) as a thin layer over messages.
Each method sends a message with a `cmd` field and the canon of the
entity, and whatever action matches that message is the store. A store
is therefore an ordinary plugin that provides actions for a fixed set
of commands: `save`, `load`, `list`, `remove`, `native` and `close`.

Rather than adding those actions itself, a store describes them to
seneca-entity:

```js
const init = seneca.export('entity/init')
const meta = init(seneca, options, { name: 'mem-store', save, load, list, remove, close, native })
```

`init` registers one action per command, as `sys:entity,cmd:<cmd>`
(from seneca-entity's `pattern_fix` option), adding the canon fields
`name`, `base` and `zone` when the store's `map` option restricts it to
some entities. It also wraps each action so that `ent` and `qent` are
always entity objects even when a message was sent by hand, hooks the
`close` command onto Seneca's close action, and gives the store a tag
and a description such as `mem-store~1~-/-/-` for log lines. The tag is
the plugin tag if there is one, otherwise a counter per store name;
this is why the untagged mem-store also appears as `mem-store$1`.

Because stores are matched by pattern, two consequences follow that
users of mem-store rely on:

* A store with canon fields in its patterns is more specific than a
  store without them, so a mapped store takes over its entities from a
  general one. That is how a database store and mem-store can share an
  instance.
* A plugin that uses the entity API has no dependency on a particular
  store. Tests can load mem-store where production loads a database.

mem-store adds three actions of its own, `role:mem-store,cmd:dump`,
`cmd:export` and `cmd:import`, for looking at and replacing the whole
store. These are outside the protocol and know nothing about tags.

## The data structure

The store is one object, held in the plugin's closure:

```js
entmap[base][name][id] = record
```

The zone of a canon is not part of the key. Entities `zen/moon/bar`
and `-/moon/bar` are filed together, and a `list$` on one finds the
records of the other; each record keeps its own canon in the `entity$`
string, so the entities you get back still say where they came from.
This is an old simplification that the test suite depends on, and it
rarely matters for the purposes mem-store serves, but it is a
difference from database stores that use the zone as a schema or
tenant.

A record is the plain object `ent.data$(true, 'string')`: the entity's
fields without the `$` suffixed ones, plus `entity$` as a string.
Private fields such as `psst$` are not stored. The copy is shallow:
nested objects and arrays are the same objects as in the entity you
saved, so changing them afterwards changes the store. `save$` replies
with a deep copy, but `load$` and `list$` build their entities from the
stored records with a shallow copy too, so nested values in results are
shared with the store as well. Treat nested values as read only, or
clone them, when you keep a loaded entity around.

`load$`, `list$` and `remove$` scan every record of the canon and keep
the ones that match (see the [Query reference](../reference/query.md)).
Sorting, skipping, limiting and field trimming are applied to the
matched list in that order. There are no indexes; a list over `n`
records costs `n` comparisons per query field, which is fine for the
thousands of records a test or a prototype holds and wrong for a
production data set.

Ids are produced by the `generate_id` function, by default
seneca-entity's: six random characters from `0-9a-z`. Collisions are
possible in theory; `id$` gives you fixed ids when a test needs them.

## What is and is not persisted

Everything lives in process memory, in the Seneca instance that loaded
the plugin:

* Data survives for the life of the instance. Closing the instance does
  not clear it, but nothing can reach it afterwards.
* A new instance, a restart, or another process starts empty. Two
  instances in one process do not share data.
* `role:mem-store,cmd:export` and `cmd:import` are the only way to move
  data out and in, as a JSON string. JSON loses types: a `Date` becomes
  an ISO string and stays a string after import.
* A replacing import swaps the whole object. Anything that captured
  the previous object (the `native` export, an earlier `dump` result)
  keeps pointing at the old one.

This is the design, not an omission. mem-store exists so that
development and tests have a store that needs no setup, starts empty
every time, and can be inspected and seeded as a plain object. Durable
storage is the job of the other stores, which implement the same
protocol.

## Seneca 3 and Seneca 4

mem-store itself has no code that depends on the Seneca version; the
differences come from Seneca and seneca-entity:

| Topic | Seneca 3 | Seneca 4 |
| ----- | -------- | -------- |
| Store patterns | `sys:entity,cmd:*`, and `role:entity,cmd:*` patterns are listed as well. | `sys:entity,cmd:*`. `role:entity,cmd:*` messages are translated to them, but not listed. |
| Close hook | seneca-entity adds `sys:seneca,cmd:close`, which Seneca 3 translates to `role:seneca,cmd:close`. | `sys:seneca,cmd:close` is the close action. |
| Promises | Entity methods return promises (seneca-entity). `seneca.post` needs seneca-promisify. | Entity methods return promises; `seneca.post`, `seneca.message` and promise returning `ready` and `close` are built in. |
| `await seneca.ready()` | Needs seneca-promisify. | Built in. In the 4.0.0-rc5 prerelease it does not resolve on an idle instance, so the examples use `seneca.ready(callback)`. |
| Errors | `entity-id-exists` and `generate-invalid-entity-id` arrive with `code`, `details` and the message `seneca: <code>`. | Same. |
| Plugin options | From `use`, `options.plugin['mem-store']` and the top level `options['mem-store']`. | From `use` and `options.plugin['mem-store']` only. |
| Option validation | Gubu 8. | Gubu 9. mem-store's `defaults` are built with its own Gubu 8 and are accepted. |
| Node.js | Whatever Seneca 3 supports. | 22 or later. |

The test suite of this repository runs against Seneca 3.38, the 4.0.0
prerelease and the 4.0.0 development version without changes.

## Limits, and why they are acceptable

* Linear scans and single key sorting: enough for test data sets,
  and simple enough to be obviously correct.
* Strict equality and the small constraint set: the query language of
  seneca-entity is deliberately minimal, so that every store can
  implement it; richer queries belong to store specific extensions or
  to `native$()`.
* Zone ignored in the key: historical, see above.
* `dump`, `export` and `import` not tag aware: they predate tagged
  stores; `native$()` is the per store alternative.
* `web.dump` and `prefix`: a remnant of the seneca-web `use`
  registration message. They do nothing unless such a seneca-web is
  loaded.
