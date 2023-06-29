const Seneca = require('seneca')

run()

async function run() {
  const seneca = Seneca().test().use('promisify').use('entity').use('..')

  await seneca.ready()

  const foo1 = await seneca.entity('foo').data$({ x: 1 }).save$()
  console.log(foo1)

  const foo2 = await seneca.entity('foo').data$({ x: 2 }).save$()
  console.log(foo2)

  const list = await seneca.entity('foo').list$()
  console.log(list)
}
