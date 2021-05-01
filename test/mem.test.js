/*
  MIT License,
  Copyright (c) 2010-2020, Richard Rodger and other contributors.
*/

'use strict'

const Util = require('util')

const Assert = require('assert')
const Async = require('async')
const Seneca = require('seneca')
const Shared = require('seneca-store-test')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const { expect } = Code
const lab = (exports.lab = Lab.script())
const { describe, before, beforeEach } = lab
const it = make_it(lab)
// const before = lab.before

function makeSenecaForTest() {
  const seneca = Seneca({
    log: 'silent',
    default_plugins: { 'mem-store': false },
  })

  seneca.use({ name: '..', tag: '1' })

  if (seneca.version >= '2.0.0') {
    seneca.use('entity', { mem_store: false })
  }

  return seneca
}

const seneca = Seneca({
  log: 'silent',
  default_plugins: { 'mem-store': false },
})
seneca.use({ name: '..', tag: '1' })

const senecaMerge = Seneca({
  log: 'silent',
})
senecaMerge.use({ name: '..', tag: '1' }, { merge: false })

if (seneca.version >= '2.0.0') {
  seneca.use('entity', { mem_store: false })
  senecaMerge.use('entity', { mem_store: false })
}

const seneca_test = Seneca({ require })
  .test()
  .use('promisify')
  .use('entity', { mem_store: false })
//.use('..')

const test_opts = {
  seneca: seneca_test,
  name: 'mem-store',
}

Shared.test.init(lab, test_opts)
Shared.test.keyvalue(lab, test_opts)

describe('mem-store tests', function () {
  Shared.basictest({
    seneca: seneca,
    senecaMerge: senecaMerge,
    script: lab,
  })

  Shared.limitstest({
    seneca: seneca,
    script: lab,
  })

  // TODO: does not seem to include ents that are equvalent for sorting
  Shared.sorttest({
    seneca: seneca,
    script: lab,
  })

  it('export-native', function (fin) {
    Assert.ok(
      seneca.export('mem-store$1/native') || seneca.export('mem-store/1/native')
    )
    fin()
  })

  it('custom-test', function (fin) {
    seneca.test(fin)

    var ent = seneca.make('foo', { id$: '0', q: 1 })

    ent.save$(function (err) {
      Assert.ok(null === err)

      seneca.act('role:mem-store, cmd:export', function (err, exported) {
        var expected =
          '{"undefined":{"foo":{"0":{"entity$":"-/-/foo","q":1,"id":"0"}}}}'

        Assert.ok(null === err)
        Assert.equal(exported.json, expected)

        var data = JSON.parse(exported.json)
        data['undefined']['foo']['1'] = { entity$: '-/-/foo', val: 2, id: '1' }

        seneca.act(
          'role:mem-store, cmd:import',
          { json: JSON.stringify(data) },
          function (err) {
            Assert.ok(null === err)

            seneca.make('foo').load$('1', function (err, foo) {
              Assert.ok(null === err)
              Assert.equal(2, foo.val)

              fin()
            })
          }
        )
      })
    })
  })

  it('import', function (fin) {
    seneca.test(fin)

    seneca.act(
      'role:mem-store, cmd:import',
      { json: JSON.stringify({ foo: { bar: { aaa: { id: 'aaa', a: 1 } } } }) },
      function (err) {
        seneca.make('foo/bar').load$('aaa', function (err, aaa) {
          Assert.equal('$-/foo/bar;id=aaa;{a:1}', aaa.toString())

          seneca.act(
            'role:mem-store, cmd:import, merge:true',
            {
              json: JSON.stringify({
                foo: {
                  bar: {
                    aaa: { id: 'aaa', a: 2 },
                    bbb: { id: 'bbb', a: 3 },
                  },
                },
              }),
            },
            function (err) {
              seneca.make('foo/bar').load$('aaa', function (err, aaa) {
                Assert.equal('$-/foo/bar;id=aaa;{a:2}', aaa.toString())

                seneca.make('foo/bar').load$('bbb', function (err, bbb) {
                  Assert.equal('$-/foo/bar;id=bbb;{a:3}', bbb.toString())

                  seneca.act('role:mem-store, cmd:export', function (err, out) {
                    Assert.equal(
                      '{"foo":{"bar":{"aaa":{"id":"aaa","a":2},"bbb":{"id":"bbb","a":3}}}}',
                      out.json
                    )
                    fin()
                  })
                })
              })
            }
          )
        })
      }
    )
  })

  it('generate_id', function (fin) {
    seneca.make$('foo', { a: 1 }).save$(function (err, out) {
      if (err) return fin(err)

      Assert(6 === out.id.length)
      fin()
    })
  })

  it('fields', function (fin) {
    seneca.test(fin)

    var ent = seneca.make('foo', { id$: 'f0', a: 1, b: 2, c: 3 })

    ent.save$(function (err, foo0) {
      foo0.list$({ id: 'f0', fields$: ['a', 'c'] }, function (err, list) {
        expect(list[0].toString()).equal('$-/-/foo;id=f0;{a:1,c:3}')

        foo0.load$(
          { id: 'f0', fields$: ['a', 'not-a-fields'] },
          function (err, out) {
            expect(out.toString()).equal('$-/-/foo;id=f0;{a:1}')
            fin()
          }
        )
      })
    })
  })

  it('in-query', function (fin) {
    seneca.test(fin)

    seneca.make('zed', { p1: 'a', p2: 10 }).save$()
    seneca.make('zed', { p1: 'b', p2: 20 }).save$()
    seneca.make('zed', { p1: 'c', p2: 30 }).save$()
    seneca.make('zed', { p1: 'a', p2: 40 }).save$()
    seneca.ready(function () {
      seneca.make('zed').list$({ p1: 'a' }, function (err, list) {
        //console.log(err,list)
        expect(list.length).equal(2)

        seneca.make('zed').list$({ p1: ['a'] }, function (err, list) {
          //console.log(err,list)
          expect(list.length).equal(2)

          seneca.make('zed').list$({ p1: ['a', 'b'] }, function (err, list) {
            //console.log(err,list)
            expect(list.length).equal(3)
            fin()
          })
        })
      })
    })
  })

  it('mongo-style-query', function (fin) {
    seneca.test(fin)

    seneca.make('mongo', { p1: 'a', p2: 10 }).save$()
    seneca.make('mongo', { p1: 'b', p2: 20 }).save$()
    seneca.make('mongo', { p1: 'c', p2: 30 }).save$()
    seneca.make('mongo', { p1: 'a', p2: 40 }).save$()

    seneca.ready(function () {
      let m = seneca.make('mongo')

      m.list$({ p2: { $gte: 20 } }, function (err, list) {
        //console.log(err,list)
        expect(list.length).equal(3)

        m.list$({ p2: { $gt: 20 } }, function (err, list) {
          //console.log(err,list)
          expect(list.length).equal(2)

          m.list$({ p2: { $lt: 20 } }, function (err, list) {
            //console.log(err,list)
            expect(list.length).equal(1)

            m.list$({ p2: { $lte: 20 } }, function (err, list) {
              //console.log(err,list)
              expect(list.length).equal(2)

              m.list$({ p2: { $ne: 20 } }, function (err, list) {
                //console.log(err,list)
                expect(list.length).equal(3)

                m.list$({ p1: { $in: ['a', 'b'] } }, function (err, list) {
                  // console.log(err,list)
                  expect(list.length).equal(3)

                  m.list$({ p1: { $nin: ['a', 'b'] } }, function (err, list) {
                    // console.log(err,list)
                    expect(list.length).equal(1)

                    // ignore unknown constraints
                    m.list$(
                      { p1: { $notaconstraint: 'whatever' } },
                      function (err, list) {
                        // console.log(err,list)
                        expect(list.length).equal(4)

                        fin()
                      }
                    )
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  describe('upsert', () => {
    describe('save$ invoked on a new entity instance', () => {
      describe('matching entity exists', () => {
        const app = makeSenecaForTest()

        before(fin => app.ready(fin))

        beforeEach(fin => {
          app.make('user')
            .data$({ username: 'richard' })
            .save$(fin)
        })

        beforeEach(fin => {
          app.make('user')
            .data$({ username: 'bob' })
            .save$(fin)
        })

        it('updates the entity', fin => {
          app.test(fin)

          app.ready(() => {
            app.make('user')
              .data$({ username: 'richard', points: 9999 })
              .save$({ upsert$: ['username'] }, err => {
                if (err) {
                  return fin(err)
                }

                app.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(2)


                  expect(users[0]).to.contain({
                    username: 'richard',
                    points: 9999
                  })


                  expect(users[1]).to.contain({
                    username: 'bob'
                  })

                  expect(users[1]).to.not.contain('points')


                  return fin()
                })
              })
          })
        })
      })

      describe('many matching entities exist', () => {
        const app = makeSenecaForTest()

        before(fin => app.ready(fin))

        beforeEach(fin => {
          app.make('product')
            .data$({ label: 'a toothbrush', price: '3.95' })
            .save$(fin)
        })

        beforeEach(fin => {
          app.make('product')
            .data$({ label: 'a toothbrush', price: '3.70' })
            .save$(fin)
        })

        beforeEach(fin => {
          app.make('product')
            .data$({ label: 'bbs tires', price: '4.10' })
            .save$(fin)
        })

        it('updates a single matching entity', fin => {
          app.test(fin)

          app.ready(() => {
            app.make('product')
              .data$({ label: 'a toothbrush', price: '4.95' })
              .save$({ upsert$: ['label'] }, err => {
                if (err) {
                  return fin(err)
                }

                app.make('product').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(3)

                  expect(products[0]).to.contain({
                    label: 'a toothbrush',
                    price: '4.95'
                  })

                  expect(products[1]).to.contain({
                    label: 'a toothbrush',
                    price: '3.70'
                  })

                  expect(products[2]).to.contain({
                    label: 'bbs tires',
                    price: '4.10'
                  })

                  return fin()
                })
              })
          })
        })
      })

      describe('no matching entities exist', () => {
        describe('normally', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'a macchiato espressionado', price: '3.40' })
              .save$(fin)
          })

          it('creates a new entity', fin => {
            app.test(fin)

            app.make('product')
              .data$({ label: 'b toothbrush', price: '3.40' })
              .save$({ upsert$: ['label'] }, err => {
                if (err) {
                  return fin(err)
                }

                app.make('product').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[0]).to.contain({
                    label: 'a macchiato espressionado',
                    price: '3.40'
                  })

                  expect(products[1]).to.contain({
                    label: 'b toothbrush',
                    price: '3.40'
                  })

                  return fin()
                })
              })
          })
        })

        describe('bombarding the store with near-parallel upserts', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          it('does not result in a race condition - creates a single new entity', fin => {
            app.test(fin)

            const product_entity = app.entity('product')

            const upsertProduct = cb => 
              product_entity
                .data$({ name: 'pencil', price: '1.95' })
                .save$({ upsert$: ['name'] }, cb)


            Async.parallel([
              upsertProduct,
              upsertProduct,
              upsertProduct
            ], err => {
              if (err) {
                return fin(err)
              }

              product_entity.list$((err, products) => {
                if (err) {
                  return fin(err)
                }

                expect(products.length).to.equal(1)

                expect(products[0]).to.contain({
                  name: 'pencil',
                  price: '1.95'
                })

                return fin()
              })
            })

            return
          })
        })
      })

      describe('edge cases', () => {
        describe('entity matches on a private field', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'toothbrush', price: '3.95', psst$: 'private' })
              .save$(fin)
          })

          it('creates a new entity', fin => {
            app.test(fin)

            app.ready(() => {
              app.make('product')
                .data$({ label: 'a new toothbrush', price: '5.95', psst$: 'private' })
                .save$({ upsert$: ['psst$'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('product').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: 'toothbrush',
                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'a new toothbrush',
                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('empty upsert$ array', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'toothbrush', price: '3.95' })
              .save$(fin)
          })

          it('creates a new document', fin => {
            app.test(fin)

            app.ready(() => {
              app.make('product')
                .data$({ label: 'toothbrush', price: '5.95' })
                .save$({ upsert$: [] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('product').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: 'toothbrush',
                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'toothbrush',
                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('entity matches on a field with the `undefined` value', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: undefined, price: '3.95' })
              .save$(fin)
          })

          it('creates a new document', fin => {
            app.test(fin)

            app.ready(() => {
              app.make('product')
                .data$({ label: undefined, price: '5.95' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('product').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      // NOTE: Seneca is stripping out fields
                      // with a value of `undefined` in a document.
                      //
                      // label: undefined,

                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      // NOTE: Seneca is stripping out fields
                      // with a value of `undefined` in a document.
                      //
                      // label: undefined,

                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('entity matches on a field with the null value', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: null, price: '3.95' })
              .save$(fin)
          })

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'CS101 textbook', price: '134.95' })
              .save$(fin)
          })

          it('updates the existing entity', fin => {
            app.test(fin)

            app.ready(() => {
              app.make('product')
                .data$({ label: null, price: '5.95' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('product').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: null,
                      price: '5.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'CS101 textbook',
                      price: '134.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('some fields in data$/upsert$ are not present in existing entities', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'a toothbrush', price: '3.40' })
              .save$(fin)
          })

          it('creates a new entity', fin => {
            app.test(fin)

            app.make('product')
              .data$({ label: 'a toothbrush', price: '2.95', coolness_factor: '0.95' })
              .save$({ upsert$: ['label', 'coolness_factor'] }, err => {
                if (err) {
                  return fin(err)
                }

                app.make('product').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[1]).to.contain({
                    label: 'a toothbrush',
                    price: '2.95',
                    coolness_factor: '0.95'
                  })


                  return fin()
                })
              })
          })
        })

        describe('fields in upsert$ are not present in the data$ object', () => {
          const app = makeSenecaForTest()

          before(fin => app.ready(fin))

          beforeEach(fin => {
            app.make('product')
              .data$({ label: 'a toothbrush', price: '3.40' })
              .save$(fin)
          })

          it('creates a new entity because it can never match', fin => {
            app.test(fin)

            app.make('product')
              .data$({ label: 'a toothbrush', price: '2.95' })
              .save$({ upsert$: ['label', 'coolness_factor'] }, err => {
                if (err) {
                  return fin(err)
                }

                app.make('product').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[0]).to.contain({
                    label: 'a toothbrush',
                    price: '3.40'
                  })

                  expect(products[1]).to.contain({
                    label: 'a toothbrush',
                    price: '2.95'
                  })

                  return fin()
                })
              })
          })
        })

        describe('upserting on the id field', () => {
          describe('matching entity exists', () => {
            const app = makeSenecaForTest()

            before(fin => app.ready(fin))


            const id_of_richard = 'some_id'

            beforeEach(fin => {
              app.make('user')
                .data$({ id: id_of_richard, username: 'richard', points: 8000 })
                .save$(fin)
            })


            beforeEach(fin => {
              app.make('user')
                .data$({ username: 'bob', points: 1000 })
                .save$(fin)
            })

            it('updates the matching entity', fin => {
              app.test(fin)

              app.make('user')
                .data$({ id: id_of_richard, username: 'richard', points: 9999 })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('user').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(2)

                    expect(users[0]).to.contain({
                      id: id_of_richard,
                      username: 'richard',
                      points: 9999
                    })

                    expect(users[1]).to.contain({
                      username: 'bob',
                      points: 1000
                    })

                    return fin()
                  })
                })
            })

            it('works with load$ after the update', fin => {
              app.test(fin)

              app.make('user')
                .data$({ id: id_of_richard, username: 'richard', points: 9999 })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('user').load$(id_of_richard, (err, user) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(user).to.contain({
                      id: id_of_richard,
                      username: 'richard',
                      points: 9999
                    })

                    return fin()
                  })
                })
            })
          })

          describe('matching entity does not exist', () => {
            const app = makeSenecaForTest()

            before(fin => app.ready(fin))

            const some_id = 'some_id'

            beforeEach(fin => {
              app.make('user')
                .data$({ username: 'richard' })
                .save$(fin)
            })

            it('creates a new document with that id', fin => {
              app.test(fin)

              app.make('user')
                .data$({ id: some_id, username: 'jim' })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('user').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(2)

                    expect(users[0]).to.contain({
                      username: 'richard'
                    })

                    expect(users[1]).to.contain({
                      id: some_id,
                      username: 'jim'
                    })

                    return fin()
                  })
                })
            })

            it('works with load$ after the creation', fin => {
              app.test(fin)

              app.make('user')
                .data$({ id: some_id, username: 'jim' })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  app.make('user').load$(some_id, (err, user) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(user).to.contain({
                      id: some_id,
                      username: 'jim'
                    })

                    return fin()
                  })
                })
            })
          })
        })
      })
    })

    describe('save$ invoked as a method on an existing entity instance', () => {
      describe('a matching entity exists', () => {
        const app = makeSenecaForTest()

        before(fin => app.ready(fin))


        let existing_product

        beforeEach(fin => {
          app.make('product')
            .data$({ label: 'a macchiato espressionado', price: '3.40' })
            .save$((err, new_product) => {
              if (err) {
                return fin(err)
              }

              existing_product = new_product

              return fin()
            })
        })


        beforeEach(fin => {
          app.make('product')
            .data$({ label: 'a macchiato espressionado', price: '7.99' })
            .save$(fin)
        })


        it('ignores the upsert$ directive and updates the existing entity, as it normally would', fin => {
          app.test(fin)

          existing_product
            .data$({ label: 'a macchiato espressionado', price: '3.95' })
            .save$({ upsert$: ['label'] }, err => {
              if (err) {
                return fin(err)
              }

              app.make('product').list$({}, (err, products) => {
                if (err) {
                  return fin(err)
                }

                expect(products.length).to.equal(2)

                expect(products[0]).to.contain({
                  label: 'a macchiato espressionado',
                  price: '3.95'
                })

                expect(products[1]).to.contain({
                  label: 'a macchiato espressionado',
                  price: '7.99'
                })

                return fin()
              })
            })
        })
      })
    })
  })
})

function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function (x, fin) {
        func(fin)
      })
    )
  }
}
