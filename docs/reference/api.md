# API reference

What the module exports, what the plugin exports into Seneca, and the
layout of the store object. For the action patterns see
[Messages](messages.md); for options see [Options](options.md).

## Module

```js
const MemStore = require('seneca-mem-store')
```

`MemStore` is the plugin definition function (`function mem_store(options)`),
named `mem-store`. Load it with `seneca.use(MemStore, options)`,
`seneca.use('mem-store', options)` or, with a tag,
`seneca.use({ name: 'mem-store', tag: 'cache', define: MemStore }, options)`.
It is also loaded for you by `seneca.use('entity')` unless the entity
option `mem_store` is `false`.

| Property | Type | Meaning |
| -------- | ---- | ------- |
| `MemStore.defaults` | object | The option shape (Gubu builders and plain default values). See [Options](options.md). |
| `MemStore.preload` | function | Plugin preload hook; registers a placeholder `native` export before the plugin is defined. Internal. |
| `MemStore.intern` | class with static methods | The internal helpers used by the store: `is_new`, `is_upsert`, `find_mement`, `update_mement`, `should_merge`, `listents`, `clean_array`, `is_object`, `is_date`, `eq_dates`. Exposed for the test suite; no compatibility promise. |

The package is written in TypeScript; `dist/mem-store.d.ts` declares
the types. `require('seneca-mem-store')` returns the function directly
(CommonJS `module.exports`), and `.default` is the same function.

The plugin requires seneca-entity (peer dependency, 27 or later) to be
loaded first: it obtains `entity/init` and `entity/generate_id` from
seneca-entity's exports.

## Plugin exports

| Export key | Value |
| ---------- | ----- |
| `seneca.export('mem-store/native')` | The store object of the mem-store instance loaded last. |
| `seneca.export('mem-store$<tag>/native')` | The store object of a tagged instance. |
| `seneca.export('mem-store$1/native')` | The store object of the untagged instance: seneca-entity tags untagged stores with a counter, starting at `1`. |
| `seneca.export('mem-store')` | The plugin record kept by Seneca (`name`, `tag`, `options`, `init`, ...). `init` is the definition function. |

The store object is the live map. A replacing
`role:mem-store,cmd:import` installs a new object, after which these
exports still return the old one; `role:mem-store,cmd:dump` and
`native$()` always return the current one.

## Entity API additions

mem-store adds nothing to the entity API. `ent.native$()` (from
seneca-entity) is answered by the store object, see
[Messages: native](messages.md#native).

## Store object layout

```js
{
  [base]: {
    [name]: {
      [id]: { entity$: 'zone/base/name', ...fields, id },
    },
  },
}
```

* `base` is the string `'undefined'` for entities without a base.
* `zone` is not part of the key. Records of entities with the same base
  and name but different zones share one map; the `entity$` string of
  each record records the zone it was saved with.
* A record is the saved entity's `data$(true, 'string')`: its fields
  without the `$` suffixed ones, plus `entity$` as a string and `id`.
* A record is a shallow copy of the saved entity: nested objects and
  arrays are shared with the entity object that was saved. `save$`
  replies with a deep copy of the record. `load$`, `list$` and
  `remove$` with `load$` reply with entities whose top level fields are
  copied from the record but whose nested objects and arrays are the
  stored ones: assigning `loaded.price = 2` changes nothing until the
  entity is saved, while `loaded.address.city = 'Cork'` changes the
  store at once.

## Log entries

At debug level the store logs `save/insert`, `save/update`,
`save/upsert`, `load`, `list`, `remove/one`, `remove/all` and `close`,
each with the store description `mem-store~<tag>~<canon>`, for example
`mem-store~1~-/-/-`.
