// Query, sort and page entity lists.
const Seneca = require('seneca')

async function main() {
  const seneca = Seneca({ log: 'warn' })
    .use('entity', { mem_store: false })
    .use(require('../..'))

  await new Promise((resolve) => seneca.ready(resolve))

  const Product = seneca.entity('shop', 'product')
  const rows = [
    { id$: 'p1', name: 'apple', price: 0.99, kind: 'fruit', tags: ['red'] },
    { id$: 'p2', name: 'pear', price: 1.5, kind: 'fruit', tags: ['green'] },
    { id$: 'p3', name: 'kiwi', price: 0.5, kind: 'fruit', tags: ['green'] },
    { id$: 'p4', name: 'leek', price: 2.25, kind: 'veg', tags: [] },
    { id$: 'p5', name: 'kale', price: 3, kind: 'veg', tags: ['green'] },
  ]
  for (const row of rows) {
    await Product.make$().data$(row).save$()
  }

  const names = (list) => list.map((p) => p.name)

  // Field equality, several fields are combined with AND.
  console.log('fruit:', names(await Product.list$({ kind: 'fruit' })))
  console.log('fruit at 1.5:', names(await Product.list$({ kind: 'fruit', price: 1.5 })))

  // An array means: any of these values.
  console.log('apple or kale:', names(await Product.list$({ name: ['apple', 'kale'] })))

  // Comparison constraints.
  console.log('price >= 1.5:', names(await Product.list$({ price: { $gte: 1.5 } })))
  console.log('1 <= price < 3:', names(await Product.list$({ price: { $gte: 1, $lt: 3 } })))
  console.log('not veg:', names(await Product.list$({ kind: { $ne: 'veg' } })))
  console.log('$in:', names(await Product.list$({ name: { $in: ['pear', 'leek'] } })))

  // Sorting: the first key of sort$ decides, 1 ascending, -1 descending.
  console.log('by price desc:', names(await Product.list$({ sort$: { price: -1 } })))

  // Paging: sort first, then skip$ and limit$.
  const page = (n) =>
    Product.list$({ sort$: { name: 1 }, skip$: n * 2, limit$: 2 })
  console.log('page 0:', names(await page(0)))
  console.log('page 1:', names(await page(1)))
  console.log('page 2:', names(await page(2)))

  // fields$: only these fields (plus id) are returned.
  const slim = await Product.list$({ kind: 'veg', fields$: ['name'] })
  console.log('fields$:', slim.map((p) => p.toString()))

  // load$ returns the first match, so sort$ picks which one.
  const priciest = await Product.load$({ sort$: { price: -1 } })
  console.log('priciest:', priciest.name)

  // Limits: comparisons are strict, and values inside arrays or objects
  // are not searched.
  console.log('price "1.5" (string):', names(await Product.list$({ price: '1.5' })))
  console.log('tags green:', names(await Product.list$({ tags: 'green' })))

  await seneca.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
