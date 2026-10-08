## 9.4.1 - 2026-10-07

* Seneca 4 prerelease support: the test suite runs unchanged against
  seneca 4.0.0-rc5 (now a devDependency) and the unreleased 4.0.0, as
  well as Seneca 3.38. The peer range is unchanged.
* Node.js 24 and 22 are the tested versions.
* `npm run build` works again with current `@types/node`: TypeScript
  updated to 5.9.
* Tests keep running with the Node.js test runner (`node --test`), which
  executes the lab based test file. Unused devDependencies removed
  (`async`, `lab-transform-typescript`); `seneca` and `seneca-entity`
  are explicit devDependencies.
* Documentation reorganized into tutorials, how-to guides, reference and
  explanation under `docs/`, with runnable examples in `docs/examples`.
* The CI workflow change (build on `master`, Node.js 24 and 22 matrix)
  is provided as a patch in `.patches/`.
* No behaviour changes.


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
