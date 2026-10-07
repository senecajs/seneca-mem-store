# Options reference

Every option accepted by mem-store, with its type, default and effect.
The defaults are defined as a [Gubu](https://github.com/rjrodger/gubu)
shape (`mem_store.defaults`), and Seneca validates the options you pass
against it when the plugin loads. An unknown key or a value of the
wrong type is fatal with the code `invalid_plugin_option`.

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `map` | object | `{}` | Which entities and commands the store handles. Keys are entity canons (`zone/base/name`, `base/name` or `name`, with `-` for an unset part); values are `'*'` or an array of command names from `save`, `load`, `list`, `remove`, `native`, `close`. Empty: all entities and all commands, registered as `sys:entity,cmd:<cmd>`. Non-empty: one pattern per canon and command, carrying the canon fields (`name`, `base`, `zone`). See [Store only some entities in memory](../how-to/store-only-some-entities-in-memory.md). |
| `merge` | boolean | `true` | What an update does with fields that the saved entity does not carry. `true`: the stored record is merged with the saved fields (`Object.assign(stored, saved)`). `false`: the stored record is replaced. The entity directive `merge$: false` forces a replace for one save. See [Control merge versus replace on save](../how-to/control-merge-versus-replace-on-save.md). |
| `generate_id` | function `(ent) => string` | seneca-entity's `generate_id` export | Produces the id of a new entity that has no `id$`. The function receives the entity being saved. The default is the function configured by seneca-entity's own `generate_id` option, which returns six random characters from `0-9a-z`. A return value of `null` or `undefined` fails the save with `generate-invalid-entity-id`. |
| `idlen` | number | `6` | Not read by the plugin. The length of generated ids is decided by `generate_id`. The option exists so that older configurations still validate. |
| `prefix` | string | `'/mem-store'` | URL prefix sent with the web route registration when `web.dump` is true. Otherwise unused. |
| `web.dump` | boolean | `false` | When true, the plugin's init sends a `role:web` message (`use: { prefix, pin: { role: 'mem-store', cmd: '*' }, map: { dump: true } }`) so that an older seneca-web (the versions with a `use` registration message) exposes `role:mem-store,cmd:dump` over HTTP. The message carries `default$: {}`, so when no `role:web` action is loaded nothing happens. |
| `entity-id-exists` | string | `'Entity of type <%=type%> with id = <%=id%> already exists.'` | Message template kept from earlier versions. It is not rendered: the error raised for a duplicate `id$` has the message `seneca: entity-id-exists` and the values in `err.details`. See [Error codes](errors.md). |

## Passing options

The plugin reads its options from the `use` call and from the `plugin`
section of the Seneca options:

```js
// explicit load (disable the default load by seneca-entity first)
seneca.use('entity', { mem_store: false }).use('mem-store', { merge: false })

// default load by seneca-entity, options through the plugin section
Seneca({ plugin: { 'mem-store': { merge: false } } }).use('entity')
```

For a tagged instance the key is `'mem-store$<tag>'`; see
[Plugins](https://github.com/senecajs/seneca/blob/master/docs/reference/plugins.md)
in the Seneca documentation for the full resolution order. Seneca 3 also
merged a top level `options['mem-store']` object; Seneca 4 does not.

## Options of seneca-entity that affect mem-store

| Option | Effect on mem-store |
| ------ | ------------------- |
| `mem_store` (default `true`) | seneca-entity loads mem-store without options. Set it to `false` to load mem-store yourself, or to use another store. |
| `generate_id` | The default id generator of mem-store. |
| `pattern_fix` (default `{ sys: 'entity' }`) | The fixed part of the store patterns. |
