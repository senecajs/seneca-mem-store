# Error codes

Errors created by mem-store, and errors from other components that a
mem-store user is likely to meet.

Errors created with `seneca.fail` carry `code`, `details` and a
`message` of the form `seneca: <code>`. They reach the `act` callback,
or reject the promise of an entity method, as shown below, on Seneca 3
and Seneca 4 alike (the `seneca-store-test` suite asserts on `code`).

## Codes defined by mem-store

| Code | When | `details` |
| ---- | ---- | --------- |
| `entity-id-exists` | A new entity was saved with an `id$` for which a record already exists. | `type`: the canon string, `id`: the id. |
| `generate-invalid-entity-id` | The `generate_id` function returned `null` or `undefined` for a new entity. | `type`: the canon string, `id`: the returned value. |

Example:

```js
await seneca.entity('foo').data$({ id$: 'dup', a: 1 }).save$()
try {
  await seneca.entity('foo').data$({ id$: 'dup', a: 2 }).save$()
} catch (err) {
  err.code    // 'entity-id-exists'
  err.message // 'seneca: entity-id-exists'
  err.details // { type: '-/-/foo', id: 'dup' }
}
```

The option `entity-id-exists` holds a message template from earlier
versions; it is not used to build the message.

## Errors from Seneca and seneca-entity

| Code | When |
| ---- | ---- |
| `act_not_found` | The entity or command is not covered by the `map` option, or no store is loaded for it. The message names the pattern that was not found. |
| `invalid_plugin_option` | An option is unknown or has the wrong type. Fatal when the plugin loads. |
| `store_cmd_missing` | Raised by seneca-entity when a store lacks a command; cannot happen with mem-store, which implements all six. |

## Errors without a code

| Error | When |
| ----- | ---- |
| `SyntaxError` | `role:mem-store,cmd:import` received no `json` or invalid JSON. |
| `TypeError` from `seneca.export('entity/init')` | mem-store was loaded before seneca-entity, or without it. Load seneca-entity first (the default load does this). |
