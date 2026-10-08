# Examples

Runnable programs used by the tutorial and the how-to guides. Each file
loads the plugin from this repository with
`.use('entity', { mem_store: false }).use(require('../..'))`; in your
own project write `seneca.use('entity')` (which loads mem-store) or
`seneca.use('entity', { mem_store: false }).use('mem-store', options)`.

| File | Used by |
| ---- | ------- |
| [getting-started.js](getting-started.js) | [Getting started](../tutorials/getting-started.md) |
| [import-export.js](import-export.js) | [Seed and inspect data with import and export](../how-to/seed-and-inspect-data-with-import-and-export.md) |
| [shop-plugin-tests.js](shop-plugin-tests.js) | [Use mem-store as the test store for a plugin](../how-to/use-mem-store-as-the-test-store-for-a-plugin.md) |
| [merge-versus-replace.js](merge-versus-replace.js) | [Control merge versus replace on save](../how-to/control-merge-versus-replace-on-save.md) |
| [query-sort-page.js](query-sort-page.js) | [Query, sort and page entity lists](../how-to/query-sort-and-page-entity-lists.md) |
| [upsert.js](upsert.js) | [Update or insert with upsert](../how-to/update-or-insert-with-upsert.md) |
| [only-some-entities.js](only-some-entities.js) | [Store only some entities in memory](../how-to/store-only-some-entities-in-memory.md) |

Run them from the repository root after `npm install` and
`npm run build`, with Node.js 22 or later:

```sh
node docs/examples/getting-started.js
```

Generated ids are random, so they differ from the outputs shown in the
pages.
