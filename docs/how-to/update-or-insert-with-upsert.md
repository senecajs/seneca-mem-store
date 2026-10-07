# Update or insert with upsert

How to save an entity so that an existing record matched by one or
more fields is updated, and a new record is inserted otherwise. The
program used here is [docs/examples/upsert.js](../examples/upsert.js).

## 1. Save a new entity with `upsert$`

```js
const Player = seneca.entity('game', 'player')

const alice = await Player.make$().data$({ username: 'alice', points: 1 }).save$()
// $-/game/player;id=8xvg9f;{username:alice,points:1}

const again = await Player.make$()
  .data$({ username: 'alice', points: 5 })
  .save$({ upsert$: ['username'] })
// $-/game/player;id=8xvg9f;{username:alice,points:5}
```

`upsert$` names the fields that identify the record. The entity must be
new (no `id`). mem-store looks for the first stored record of the same
canon whose listed fields are all strictly equal to the saved values.
If it finds one, it copies the saved fields onto that record, which
keeps its id, and replies with it.

## 2. Fall back to insert

Without a match the save is an ordinary insert with a generated id:

```js
const bob = await Player.make$()
  .data$({ username: 'bob', points: 2 })
  .save$({ upsert$: ['username'] })
// $-/game/player;id=pycr9b;{username:bob,points:2}
```

The same happens when the saved entity lacks one of the listed fields:

```js
await Player.make$().data$({ points: 9 }).save$({ upsert$: ['username'] })
// $-/game/player;id=yv4lva;{points:9}
```

## Rules

* Only new entities are upserted. An entity with an `id` is updated by
  id and `upsert$` is ignored.
* Several fields can be listed; all of them must match.
* Names containing `$` in the list are ignored.
* A match is updated with `Object.assign`, so fields the saved entity
  does not carry are kept, whatever the `merge` option says.
* The match is found by a scan of the records of that canon, like every
  query in mem-store.

## Complete output

```
inserted: $-/game/player;id=8xvg9f;{username:alice,points:1}
upserted: $-/game/player;id=8xvg9f;{username:alice,points:5} same id: true
inserted: $-/game/player;id=pycr9b;{username:bob,points:2}
inserted: $-/game/player;id=yv4lva;{points:9}
players: [
  { points: 9, id: 'yv4lva' },
  { username: 'alice', points: 5, id: '8xvg9f' },
  { username: 'bob', points: 2, id: 'pycr9b' }
]
import reply: null
```
