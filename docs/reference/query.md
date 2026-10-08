# Query reference

The query object accepted by `load$`, `list$` and `remove$` (the `q`
field of the `sys:entity` messages), the `$` directives, and the limits
of what mem-store can select. For task oriented examples see
[Query, sort and page entity lists](../how-to/query-sort-and-page-entity-lists.md).

## Query forms

| Form | Meaning |
| ---- | ------- |
| `load$('p1')`, `remove$('p1')` | An id. seneca-entity turns it into `{ id: 'p1' }`. Numbers are accepted too. |
| `load$()` on an entity that has an id | `{ id: ent.id }`: reload the entity. |
| `load$({ ... })`, `list$({ ... })`, `remove$({ ... })` | A query object: field conditions and directives. |
| `list$()` or `list$({})` | Every record of the canon. |
| `load$({})`, `remove$({})` | Nothing: seneca-entity answers `null` without sending a message. |

Keys of the query object whose name contains `$` are directives and are
never matched against record fields. Keys with an `undefined` value are
removed by seneca-entity before the message is sent.

## Field conditions

All conditions must hold for a record to match (AND). Records are
matched against their stored fields, including `id`.

| Query value | Matches when |
| ----------- | ------------ |
| string, number, boolean, `null` | The stored value is strictly equal (`===`). `'1'` does not match `1`. A missing field never matches a value other than `undefined`. |
| array | The stored value is strictly equal to one of the elements. An empty array matches nothing. |
| `Date` | The stored value is a `Date` with the same time value. A string or number never matches a stored `Date`, and a `Date` never matches a stored string. |
| object | A set of constraints, see below. |

### Constraints

An object value is read as constraints on the stored value `v`:

| Key | Matches when |
| --- | ------------ |
| `$ne: x` | `v != x` |
| `$gte: x` | `v >= x` |
| `$gt: x` | `v > x` |
| `$lt: x` | `v < x` |
| `$lte: x` | `v <= x` |
| `$in: [...]` | `v` is strictly equal to an element |
| `$nin: [...]` | `v` is not strictly equal to any element |

Several constraints in one object are combined with AND. Rules:

* A constraint whose value is `null` or `undefined` is ignored.
* Keys that are not in the table are ignored. An object with no
  effective constraint therefore matches every record; in particular,
  a query by a nested object such as `{ address: { city: 'Cork' } }`
  does not filter.
* `$gte`, `$gt`, `$lt` and `$lte` use the JavaScript comparison
  operators, so they work for numbers and strings and, through
  `valueOf`, for `Date` values.

## Directives

| Directive | Used by | Effect |
| --------- | ------- | ------ |
| `sort$: { field: 1 }` | load, list, remove | Sort by `field`, ascending for a value of `0` or more, descending for a negative value. Only the first key of the object is used. Values are compared with `<` and `===`; equal values keep their insertion order. |
| `skip$: n` | load, list, remove | Drop the first `n` records after sorting. Only values greater than `0` have an effect. |
| `limit$: n` | load, list, remove | Keep at most `n` records after skipping. Only values greater than `0` have an effect; `limit$: 0` returns everything. |
| `fields$: ['a', 'b']` | load, list | Return only the listed fields. `id` is always returned. Fields that do not exist are ignored. The stored records are not changed. |
| `all$: true` | remove | Remove every matching record. Without it only the first record (after sort, skip and limit) is removed. |
| `load$: true` | remove | Reply with the removed entity. Ignored together with `all$`. |
| `upsert$: ['field', ...]` | save | For a new entity: update the first stored record whose listed fields all match, instead of inserting. See [Update or insert with upsert](../how-to/update-or-insert-with-upsert.md). |

Directives that belong to the entity rather than to the query:

| Directive | Effect |
| --------- | ------ |
| `id$: 'fixed'` | Use this id for a new entity. A record with that id must not exist (`entity-id-exists`). |
| `merge$: false` | Replace the stored record instead of merging. See [Options: merge](options.md). |

## Order of evaluation

For `load$`, `list$` and `remove$`:

1. Collect the records of the canon (base and name) that satisfy every
   field condition. Without conditions, all records.
2. Sort (`sort$`).
3. Skip (`skip$`).
4. Limit (`limit$`).
5. Trim fields (`fields$`).

`load$` then returns the first record or `null`. `remove$` deletes the
first record, or all of them with `all$`.

Every query is a scan of all records of the canon; there are no
indexes. Zone is not part of the lookup: records of the same base and
name are found whatever zone the query entity has (see
[How mem-store works](../explanation/how-mem-store-works.md)).

## Limits

mem-store does not support:

* OR between fields, or between values other than the array form.
* Partial, prefix or regular expression matching.
* Nested paths (`'address.city'`), and matching inside stored arrays
  or objects.
* Case insensitive matching or type coercion.
* Sorting by more than one field, or by computed values.
* Counting, grouping or other aggregation.
* Limiting with `limit$: 0`.
* Querying by `Date` after an export and import, because the value is
  then a string.
