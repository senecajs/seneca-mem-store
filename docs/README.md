# @seneca/mem-store documentation

The documentation follows the [Diátaxis](https://diataxis.fr/)
structure: tutorials to learn, how-to guides for tasks, reference to
look things up, and explanation to understand the design. The programs
used in the pages are in [examples](examples/) and were run against the
Seneca 4 prerelease; the outputs shown are real.

## Tutorials

| Tutorial | What you learn |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | Install, save, load, update, query, remove, and look inside the store. |

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Seed and inspect data with import and export](how-to/seed-and-inspect-data-with-import-and-export.md) | Fixtures in the store's shape, replace and merge imports, export to JSON, dump, clearing, caveats. |
| [Use mem-store as the test store for a plugin](how-to/use-mem-store-as-the-test-store-for-a-plugin.md) | One instance per test, seeding, asserting on stored data, resetting, predictable ids. |
| [Control merge versus replace on save](how-to/control-merge-versus-replace-on-save.md) | The `merge` option and the `merge$` directive. |
| [Query, sort and page entity lists](how-to/query-sort-and-page-entity-lists.md) | Equality, arrays, comparison constraints, `sort$`, `skip$`, `limit$`, `fields$`, `load$` with sorting. |
| [Update or insert with upsert](how-to/update-or-insert-with-upsert.md) | `save$({ upsert$: [...] })`. |
| [Store only some entities in memory](how-to/store-only-some-entities-in-memory.md) | The `map` option, running two stores, reaching a specific store. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Options](reference/options.md) | Every option with type, default and effect; how options are passed. |
| [Messages](reference/messages.md) | Every action pattern: fields, reply, errors, log entries. |
| [Query](reference/query.md) | Query forms, field conditions, constraints, directives, order of evaluation, limits. |
| [Error codes](reference/errors.md) | Errors created by mem-store and related errors from Seneca. |
| [API](reference/api.md) | Module exports, plugin exports, store object layout, log entries. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [How mem-store works](explanation/how-mem-store-works.md) | The seneca-entity store protocol, the data structure, what is and is not persisted, Seneca 3 versus 4, limits. |

## Feature index

Every option, action pattern, directive, export and error code of the
plugin, with the page that documents it. mem-store has no command line
flags.

| Feature | Kind | Documented in |
| ------- | ---- | ------------- |
| `map` | option | [Options](reference/options.md), [Store only some entities in memory](how-to/store-only-some-entities-in-memory.md) |
| `merge` | option | [Options](reference/options.md), [Control merge versus replace on save](how-to/control-merge-versus-replace-on-save.md) |
| `generate_id` | option | [Options](reference/options.md), [Use mem-store as the test store for a plugin](how-to/use-mem-store-as-the-test-store-for-a-plugin.md#predictable-ids) |
| `idlen` | option (not read) | [Options](reference/options.md) |
| `prefix` | option | [Options](reference/options.md) |
| `web.dump` | option | [Options](reference/options.md) |
| `entity-id-exists` | option (message template, unused) | [Options](reference/options.md), [Error codes](reference/errors.md) |
| `sys:entity,cmd:save` | action | [Messages: save](reference/messages.md#save) |
| `sys:entity,cmd:load` | action | [Messages: load](reference/messages.md#load) |
| `sys:entity,cmd:list` | action | [Messages: list](reference/messages.md#list) |
| `sys:entity,cmd:remove` | action | [Messages: remove](reference/messages.md#remove) |
| `sys:entity,cmd:native` | action | [Messages: native](reference/messages.md#native) |
| `sys:seneca,cmd:close` (store close hook) | action | [Messages: close](reference/messages.md#close) |
| `role:entity,cmd:*` (translated) | action | [Messages](reference/messages.md), [How mem-store works](explanation/how-mem-store-works.md#seneca-3-and-seneca-4) |
| `role:mem-store,cmd:dump` | action | [Messages: dump](reference/messages.md#dump), [Seed and inspect data](how-to/seed-and-inspect-data-with-import-and-export.md) |
| `role:mem-store,cmd:export` | action | [Messages: export](reference/messages.md#export), [Seed and inspect data](how-to/seed-and-inspect-data-with-import-and-export.md) |
| `role:mem-store,cmd:import` | action | [Messages: import](reference/messages.md#import), [Seed and inspect data](how-to/seed-and-inspect-data-with-import-and-export.md) |
| `id$` | entity directive | [Query: directives](reference/query.md#directives), [Messages: save](reference/messages.md#save) |
| `merge$` | entity directive | [Query: directives](reference/query.md#directives), [Control merge versus replace on save](how-to/control-merge-versus-replace-on-save.md) |
| `upsert$` | save directive | [Query: directives](reference/query.md#directives), [Update or insert with upsert](how-to/update-or-insert-with-upsert.md) |
| `sort$`, `skip$`, `limit$`, `fields$` | query directives | [Query: directives](reference/query.md#directives), [Query, sort and page entity lists](how-to/query-sort-and-page-entity-lists.md) |
| `all$`, `load$` | remove directives | [Query: directives](reference/query.md#directives), [Messages: remove](reference/messages.md#remove) |
| Field equality, array values, `Date` values | query | [Query: field conditions](reference/query.md#field-conditions) |
| `$ne`, `$gte`, `$gt`, `$lt`, `$lte`, `$in`, `$nin` | query constraints | [Query: constraints](reference/query.md#constraints) |
| `seneca.export('mem-store/native')`, `'mem-store$<tag>/native'`, `'mem-store$1/native'` | plugin export | [API: plugin exports](reference/api.md#plugin-exports) |
| `seneca.export('mem-store')` | plugin record | [API: plugin exports](reference/api.md#plugin-exports) |
| `ent.native$()` | entity method answered by the store | [Messages: native](reference/messages.md#native), [API](reference/api.md#entity-api-additions) |
| `MemStore.defaults`, `MemStore.preload`, `MemStore.intern` | module properties | [API: module](reference/api.md#module) |
| Store object layout (`base`, `name`, `id`; zone ignored) | data structure | [API: store object layout](reference/api.md#store-object-layout), [How mem-store works](explanation/how-mem-store-works.md#the-data-structure) |
| `entity-id-exists` | error code | [Error codes](reference/errors.md) |
| `generate-invalid-entity-id` | error code | [Error codes](reference/errors.md) |
| `act_not_found`, `invalid_plugin_option`, `SyntaxError` on import | related errors | [Error codes](reference/errors.md) |
| Debug log entries (`save/insert`, `load`, `remove/all`, ...) | logging | [API: log entries](reference/api.md#log-entries) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
