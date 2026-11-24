# Changes

## 10.0.0 2026-11-20

The first version published as `@seneca/mem-store`; versions up to
9.4.0 were published as `seneca-mem-store`. 9.4.1 was prepared but not
published; its changes are part of this version.

* Seneca 4: the peer dependency is `seneca` `^4.0.0` (was
  `>=3||>=4.0.0-rc2`). Seneca 3 users stay on `seneca-mem-store@9`.
* Renamed from `seneca-mem-store` to `@seneca/mem-store`.
* The entity peer dependency is `@seneca/entity` `^29.0.0` (was
  `seneca-entity: >=27`). The entity plugin is published as
  `@seneca/entity` from 29.0.0, the first version that loads on
  Seneca 4; a peer dependency on `seneca-entity` would make npm install
  seneca-entity 28 next to it.
* Node.js 24 or later (`engines.node` `>=24`).
* Seneca 4.0.0 validates with [shape](https://github.com/rjrodger/shape),
  the renamed successor of Gubu, and rejects option defaults built with
  Gubu, so mem-store 9 stops the process at startup there
  (`plugin_gubu_shape`). `defaults` is now a function of `{ valid }`,
  the builders Seneca passes to it. The options are unchanged. The gubu
  dependency is removed; the plugin has no dependencies.
* `seneca.util.deep` replaces `seneca.util.deepextend`, which Seneca 4
  deprecates (D2); they are the same function.
* Tested with Seneca 4.0.0 and @seneca/entity 29.0.0.
* `npm run build` works again: TypeScript 5.9, and `@types/node` 24 is
  a declared devDependency.
* Tests keep running with the Node.js test runner (`node --test`), which
  executes the lab based test file. They use `@seneca/store-test` 7
  (was `seneca-store-test` 6) and `seneca-plugin-validator` 0.7, and no
  longer load `seneca-promisify`, which Seneca 4 has built in (D4).
  Unused devDependencies removed (`async`, `lab-transform-typescript`,
  `seneca-promisify`); `seneca` and `@seneca/entity` are explicit
  devDependencies.
* Documentation reorganized into tutorials, how-to guides, reference and
  explanation under `docs/`, with runnable examples in `docs/examples`.


## 6.2.0 - 2021-09-28

* Update deps.


## 6.0.0 - 2021-05-24

* Added upsert support


## 5.0.0 - 2020-12-09

* Convert to typescript
* Support mongo-style constraints ($gte, $ne, etc.)


## 0.6.0 - 2016-08-25

* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
* Updated dependencies


## 0.5.1 - 2016-08-09

* Updated dependencies


## 0.4.0 - 2015-11-25

* The memory store follows the specification of seneca stores
* Linted the codebase to folow the seneca styleguide


## 0.3.1 - 2015-06-16

*  Export action responds with object: {json: "..."}


## 0.3.0 - 2015-06-16

* cmd:import/export no longer uses filesystem, just accepts/provides JSON string. Prep for Seneca 0.6.2.
