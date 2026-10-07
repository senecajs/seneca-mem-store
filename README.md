![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin.

# @seneca/mem-store

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-mem-store/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-mem-store/actions/workflows/build.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/e2cdcc5415161cb378b0/maintainability)](https://codeclimate.com/github/senecajs/seneca-mem-store/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/17225/branches/388415/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=17225&bid=388415)

seneca-mem-store is the in-memory entity store for Seneca. It
implements the [seneca-entity][seneca-entity-url] store protocol
(`save$`, `load$`, `list$`, `remove$`) with a plain JavaScript object
as the database, so data lives only as long as the process. It is the
store that seneca-entity loads by default, and it is meant for
development, prototypes and tests. It works with Seneca 3 and Seneca 4
(tested with 3.38 and the 4.0.0 prerelease), seneca-entity 27 or
later, and Node.js 22 and 24.

The documentation is in [docs/](docs/README.md): a
[tutorial](docs/tutorials/getting-started.md), [how-to guides](docs/README.md#how-to-guides),
[reference](docs/README.md#reference) pages and an
[explanation](docs/explanation/how-mem-store-works.md) of the design,
with a [feature index](docs/README.md#feature-index) of every option,
action and error.

## Install

```sh
npm install seneca seneca-entity seneca-mem-store
```

seneca-entity depends on seneca-mem-store and loads it by default, so
the explicit install only pins the version. Seneca 4 needs Node.js 22
or later.

## Quick Example

```js
const Seneca = require('seneca')

async function main() {
  // seneca.use('entity') loads mem-store as the default store.
  const seneca = Seneca({ log: 'warn' }).use('entity')
  await new Promise((resolve) => seneca.ready(resolve))

  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'apple', price: 0.99 })
    .save$()
  console.log(apple.toString()) // $-/-/fruit;id=gwqe17;{name:apple,price:0.99}

  const cheap = await seneca
    .entity('fruit')
    .list$({ price: { $lt: 1 }, sort$: { price: 1 } })
  console.log(cheap.length) // 1

  await seneca.close()
}

main()
```

To pass options, load the plugin yourself:

```js
seneca.use('entity', { mem_store: false }).use('mem-store', { merge: false })
```

## More Examples

* [Getting started](docs/tutorials/getting-started.md): save, load,
  update, query, remove, inspect.
* [Seed and inspect data with import and export](docs/how-to/seed-and-inspect-data-with-import-and-export.md)
* [Use mem-store as the test store for a plugin](docs/how-to/use-mem-store-as-the-test-store-for-a-plugin.md)
* [Control merge versus replace on save](docs/how-to/control-merge-versus-replace-on-save.md)
* [Query, sort and page entity lists](docs/how-to/query-sort-and-page-entity-lists.md)
* [Update or insert with upsert](docs/how-to/update-or-insert-with-upsert.md)
* [Store only some entities in memory](docs/how-to/store-only-some-entities-in-memory.md)

The programs behind these pages are in [docs/examples](docs/examples/README.md).

## Motivation

Code that uses the entity API should not care which database is behind
it, and tests and prototypes should not need a database at all.
mem-store gives every Seneca application a store that starts empty,
needs no setup, and can be seeded and inspected as a plain object. How
it fits the store protocol, and what it deliberately does not do, is
explained in [How mem-store works](docs/explanation/how-mem-store-works.md).

## Support

* Open a [GitHub issue][github issue].
* Read the [Seneca documentation](https://github.com/senecajs/seneca/blob/master/docs/README.md)
  and the [seneca-entity][seneca-entity-url] documentation.
* Commercial support is available from [Voxgig](https://www.voxgig.com).

## API

You use the entity API; mem-store answers its messages.

| Entity method | Message | Reference |
| ------------- | ------- | --------- |
| `ent.save$()` | `sys:entity,cmd:save` | [Messages: save](docs/reference/messages.md#save) |
| `ent.load$(idOrQuery)` | `sys:entity,cmd:load` | [Messages: load](docs/reference/messages.md#load) |
| `ent.list$(query)` | `sys:entity,cmd:list` | [Messages: list](docs/reference/messages.md#list) |
| `ent.remove$(idOrQuery)` | `sys:entity,cmd:remove` | [Messages: remove](docs/reference/messages.md#remove) |
| `ent.native$()` | `sys:entity,cmd:native` | [Messages: native](docs/reference/messages.md#native) |

| Plugin action | Purpose | Reference |
| ------------- | ------- | --------- |
| `role:mem-store,cmd:dump` | The live store object. | [Messages: dump](docs/reference/messages.md#dump) |
| `role:mem-store,cmd:export` | The store as a JSON string. | [Messages: export](docs/reference/messages.md#export) |
| `role:mem-store,cmd:import` | Replace or merge the store from a JSON string. | [Messages: import](docs/reference/messages.md#import) |

| Option | Default | Reference |
| ------ | ------- | --------- |
| `map` | `{}` | [Options](docs/reference/options.md) |
| `merge` | `true` | [Options](docs/reference/options.md) |
| `generate_id` | seneca-entity's generator | [Options](docs/reference/options.md) |
| `idlen`, `prefix`, `web.dump`, `entity-id-exists` | see reference | [Options](docs/reference/options.md) |

Queries: field equality, arrays, `$ne`, `$gte`, `$gt`, `$lt`, `$lte`,
`$in`, `$nin`, `sort$`, `skip$`, `limit$`, `fields$`, `all$`, `load$`,
`upsert$`; see the [Query reference](docs/reference/query.md). Error
codes: `entity-id-exists`, `generate-invalid-entity-id`; see
[Error codes](docs/reference/errors.md). Exports: see
[API](docs/reference/api.md).

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

### Running tests

The tests need Node.js 22 or 24 and run against the Seneca 4 prerelease
declared in `devDependencies`:

```sh
npm install
npm run build
npm test
```

`npm test` runs `test/mem.test.js` with the Node.js test runner; the
file uses `@hapi/lab` and the shared `seneca-store-test` suite inside.
To run the suite against another Seneca version, install it without
saving, for example `npm install --no-save seneca@3`, and run `npm test`
again. `npm run test-lab` runs the same tests with lab's coverage and
lint report.

The example programs in [docs/examples](docs/examples/README.md) must
run to completion after a change: `node docs/examples/getting-started.js`.

### Continuous integration

Changes to `.github/workflows/build.yml` that could not be pushed with
the code are kept as patches in [.patches](.patches/README.md); apply
them with `git am .patches/*.patch`.

## Background

mem-store is one of the oldest Seneca plugins. Earlier Seneca versions
loaded it as a default plugin; today seneca-entity loads it. Version
0.4 (2015) aligned it with the seneca-store-test specification, version
5 (2020) converted it to TypeScript and added the comparison
constraints, version 6 (2021) added upserts, and 9.4.1 adds Seneca 4
prerelease support.

| seneca-mem-store 9.4 | Supported | Tested |
| -------------------- | --------- | ------ |
| Seneca | 3, 4 (peer `>=3 || >=4.0.0-rc2`) | 3.38.0, 4.0.0-rc5, 4.0.0 development version |
| seneca-entity | 27 or later (peer) | 28.1.0 |
| Node.js | What your Seneca version supports; Seneca 4 needs 22 or later | 22, 24 |

Changes are listed in [CHANGES.md](CHANGES.md). Licensed under the
[MIT][] license.

[MIT]: ./LICENSE
[npm-badge]: https://badge.fury.io/js/seneca-mem-store.svg
[npm-url]: https://badge.fury.io/js/seneca-mem-store
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[github issue]: https://github.com/senecajs/seneca-mem-store/issues
[seneca-entity-url]: https://github.com/senecajs/seneca-entity
