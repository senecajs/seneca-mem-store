// Control merge versus replace when saving an existing entity.
const Seneca = require('seneca')

async function make(options) {
  const seneca = Seneca({ log: 'warn' })
    .use('entity', { mem_store: false })
    .use(require('../..'), options)
  await new Promise((resolve) => seneca.ready(resolve))
  return seneca
}

async function main() {
  // Default: merge: true. Fields missing from the saved entity are kept.
  let seneca = await make()

  await seneca
    .entity('user')
    .data$({ id$: 'u1', name: 'Alice', email: 'alice@example.com', role: 'admin' })
    .save$()

  // A partial entity with the same id updates only the fields it carries.
  await seneca.entity('user').data$({ id: 'u1', role: 'editor' }).save$()
  let alice = await seneca.entity('user').load$('u1')
  console.log('merge (default):', alice.data$(false))

  // merge$: false on the entity replaces the stored record.
  const replacement = seneca.entity('user').data$({ id: 'u1', name: 'Alice' })
  replacement.merge$ = false
  await replacement.save$()
  alice = await seneca.entity('user').load$('u1')
  console.log('merge$: false:', alice.data$(false))

  await seneca.close()

  // The plugin option merge: false makes replace the default.
  seneca = await make({ merge: false })

  await seneca
    .entity('user')
    .data$({ id$: 'u1', name: 'Alice', email: 'alice@example.com', role: 'admin' })
    .save$()
  await seneca.entity('user').data$({ id: 'u1', role: 'editor' }).save$()
  alice = await seneca.entity('user').load$('u1')
  console.log('merge: false option:', alice.data$(false))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
