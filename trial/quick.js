const Seneca = require('seneca')

run()

async function run() {
  const seneca = Seneca()
        .test()
        .use('promisify')
        .use('entity', { mem_store: false })
        .use('..')

  await seneca.ready()

  console.log(seneca.list())
  console.log(seneca.find('sys:seneca,cmd:close'))
  console.log(seneca.find('role:seneca,cmd:close'))

  let role_load = seneca.find('role:entity,cmd:load')
  console.log(role_load)
  // console.log(role_load.func.toString())

  const foo1 = await seneca.entity('foo').data$({ x: 1 }).save$()
  console.log(foo1)

  const foo2 = await seneca.entity('foo').data$({ x: 2 }).save$()
  console.log(foo2)

  const list = await seneca.entity('foo').list$()
  console.log(list)
}
