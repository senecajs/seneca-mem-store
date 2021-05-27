/*
  MIT License,
  Copyright (c) 2010-2021, Richard Rodger and other contributors.
*/

'use strict'

const Util = require('util')

const Assert = require('assert')
const Seneca = require('seneca')
const Shared = require('seneca-store-test')
const MakePluginValidator = require('seneca-plugin-validator')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const { expect } = Code
const lab = (exports.lab = Lab.script())
const { describe, before, after } = lab
const it = make_it(lab)

function makeSenecaForTest(opts = {}) {
  const { seneca_opts = {} } = opts

  const seneca = Seneca(
    Object.assign(
      {
        log: 'silent',
        default_plugins: { 'mem-store': false }
      },
      seneca_opts
    )
  )


  const { mem_store_opts = {} } = opts
  seneca.use({ name: '..', tag: '1' }, mem_store_opts)

  if ('2.0.0' <= seneca.version) {
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

if ('2.0.0' <= seneca.version) {
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

describe('mem-store', () => {
  it('is a plugin', fin => {
    const validatePlugin = MakePluginValidator(require('..'), module)

    validatePlugin().then(fin).catch(fin)
  })
})

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

  Shared.upserttest({
    seneca: makeSenecaForTest(),
    script: lab
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
                      JSON.stringify({
                        foo: {
                          bar: {
                            aaa: { id: 'aaa', a: 2 },
                            bbb: { id: 'bbb', a: 3 }
                          }
                        }
                      }),
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

  describe('internal utilities', () => {
    const mem_store = seneca.export('mem-store')
    const { intern } = mem_store.init

    describe('find_mement', () => {
      const ent_base = 'sys'
      const ent_name = 'product'


      describe('no such entities exist', () => {
        let entmap

        before(async () => {
          entmap = {}
        })

        it('cannot match', fin => {
          const ent = seneca.make('sys', 'product')
          const filter = { label: 'lorem ipsum' }
          const result = intern.find_mement(entmap, ent, filter)

          expect(result).to.equal(null)

          return fin()
        })
      })

      describe('same entity base, different entity name', () => {
        let entmap

        before(async () => {
          entmap = {
            [ent_base]: {
              artist: {
                foo: {
                  id: 'foo',
                  label: 'lorem ipsum'
                }
              }
            }
          }
        })

        it('cannot match', fin => {
          const ent = seneca.make(ent_base, 'product')
          const filter = { label: 'lorem ipsum' }
          const result = intern.find_mement(entmap, ent, filter)

          expect(result).to.equal(null)

          return fin()
        })
      })

      describe('filter has more fields than the entity', () => {
        let entmap

        before(async () => {
          entmap = {
            [ent_base]: {
              [ent_name]: {
                foo: {
                  id: 'foo',
                  label: 'lorem ipsum'
                }
              }
            }
          }
        })

        it('cannot match', fin => {
          const ent = seneca.make(ent_base, ent_name)
          const filter = { label: 'lorem ipsum', bar: 'baz' }
          const result = intern.find_mement(entmap, ent, filter)

          expect(result).to.equal(null)

          return fin()
        })
      })

      describe('some field mismatches', () => {
        let entmap

        before(async () => {
          entmap = {
            [ent_base]: {
              [ent_name]: {
                foo: {
                  id: 'foo',
                  label: 'lorem ipsum',
                  price: '2.34'
                }
              }
            }
          }
        })

        it('cannot match', fin => {
          const ent = seneca.make(ent_base, ent_name)
          const filter = { label: 'lorem ipsum', price: '0.95' }
          const result = intern.find_mement(entmap, ent, filter)

          expect(result).to.equal(null)

          return fin()
        })
      })

      describe('all fields and values match', () => {
        const some_product = {
          id: 'foo',
          label: 'lorem ipsum',
          price: '2.34'
        }

        
        let entmap

        before(async () => {
          entmap = {
            sys: {
              product: {
                foo: some_product
              }
            }
          }
        })

        it('returns the match', fin => {
          const ent = seneca.make(ent_base, ent_name)
          const filter = { label: 'lorem ipsum', price: '2.34' }
          const result = intern.find_mement(entmap, ent, filter)

          expect(result).to.equal(some_product)

          return fin()
        })
      })

      describe('when the filter is empty', () => {
        const some_product = {
          id: 'foo',
          label: 'lorem ipsum',
          price: '2.34'
        }

        
        let entmap

        before(async () => {
          entmap = {
            sys: {
              product: {
                foo: some_product
              }
            }
          }
        })

        it('returns the first document it comes across', fin => {
          const ent = seneca.make(ent_base, ent_name)
          const result = intern.find_mement(entmap, ent, {})

          expect(result).to.equal(some_product)

          return fin()
        })
      })
    })

    describe('is_new', () => {
      describe('passed a null', () => {
        it('returns a correct value', fin => {
          const result = intern.is_new(null)
          expect(result).to.equal(false)

          fin()
        })
      })

      describe('passed an entity that has not been saved yet', () => {
        let product

        before(() => {
          product = seneca.make('product')
            .data$({ label: 'Legions of Rome' })
        })

        it('returns a correct value', fin => {
          const result = intern.is_new(product)
          expect(result).to.equal(true)

          fin()
        })
      })

      describe('passed an entity that has been saved before', () => {
        let product

        before(() => {
          return new Promise((resolve, reject) => {
            seneca.make('product')
              .data$({ label: 'Legions of Rome' })
              .save$((err, out) => {
                if (err) {
                  return reject(err)
                }

                product = out

                return resolve()
              })
          })
        })

        it('returns a correct value', fin => {
          const result = intern.is_new(product)
          expect(result).to.equal(false)

          fin()
        })
      })

      describe('passed a new entity, but also an id arg', () => {
        let product

        before(() => {
          product = seneca.make('product')
            .data$({ id: 'my_precious', label: 'Legions of Rome' })
        })

        it('returns a correct value', fin => {
          const result = intern.is_new(product)
          expect(result).to.equal(false)

          fin()
        })
      })
    })

    describe('listents', () => {
      describe('when the query argument is a string', () => {
        const ent_base = 'sys'
        const ent_name = 'product'


        const product_id = 'foobaz'

        const product = {
          id: product_id,
          label: 'lorem ipsum',
          price: '2.34'
        }


        describe('when an entity with the same base, name, id exists', () => {
          let entmap

          before(async () => {
            entmap = {
              [ent_base]: {
                [ent_name]: {
                  [product_id]: product
                }
              }
            }
          })

          const product_ent = seneca.make(ent_base, ent_name)

          it('fetches the entity with the matching id', fin => {
            intern.listents(
              seneca,
              entmap,
              product_ent,
              product_id,
              (err, out) => {
                if (err) {
                  return fin(err)
                }

                expect(out).to.equal([product])

                return fin()
              })
          })
        })

        describe('entity with the same base, name, but not id exists', () => {
          const product_id = 'foobaz'

          const product = {
            id: product_id,
            label: 'lorem ipsum',
            price: '2.34'
          }


          let entmap

          before(async () => {
            entmap = {
              [ent_base]: {
                [ent_name]: {
                  [product_id]: product
                }
              }
            }
          })

          const product_ent = seneca.make(ent_base, ent_name)

          it('cannot match the entity', fin => {
            intern.listents(
              seneca,
              entmap,
              product_ent,
              'quix',
              (err, out) => {
                if (err) {
                  return fin(err)
                }

                expect(out).to.equal([])

                return fin()
              })
          })
        })
      })

      describe('when the query argument is an array', () => {
        const ent_base = 'sys'
        const ent_name = 'product'


        const product_id = 'foobaz'

        const product = {
          id: product_id,
          label: 'lorem ipsum',
          price: '2.34'
        }


        describe('when an item in the array is null', () => {
          let entmap

          before(async () => {
            entmap = {
              [ent_base]: {
                [ent_name]: {
                  [product_id]: product
                }
              }
            }
          })

          const product_ent = seneca.make(ent_base, ent_name)

          it('ignores the null', fin => {
            intern.listents(
              seneca,
              entmap,
              product_ent,
              [null],
              (err, out) => {
                if (err) {
                  return fin(err)
                }

                expect(out).to.equal([])

                return fin()
              })
          })
        })
      })

      describe('when the query argument is null', () => {
        const product_id = 'aaaa'

        const product = {
          id: product_id,
          label: 'lorem ipsum',
          price: '2.34'
        }


        const ent_base = 'sys'
        const ent_name = 'product'

        let entmap

        before(async () => {
          entmap = {
            [ent_base]: {
              [ent_name]: {
                [product_id]: product
              }
            }
          }
        })


        const product_ent = seneca.make(ent_base, ent_name)

        it('returns an empty list', fin => {
          intern.listents(
            seneca,
            entmap,
            product_ent,
            null,
            (err, out) => {
              if (err) {
                return fin(err)
              }

              expect(out).to.equal([])

              return fin()
            })
        })
      })
    })
  })
})

describe('additional mem-store tests', () => {
  describe('#save', () => {
    describe('when trying to create the entity with the same id', () => {
      const seneca = makeSenecaForTest()

      before(() => new Promise(fin => seneca.ready(fin)))


      it('crashes', fin => {
        seneca.test(fin)


        seneca.fail = function (...args) {
          expect(0 < args.length).to.equal(true)
          expect(args[0]).to.equal('entity-id-exists')

          return fin()
        }


        const my_product_id = 'MyPreciousId'

        seneca.make('sys', 'product')
          .data$({ id: my_product_id, label: 'lorem ipsum' })
          .save$((err, _out) => {
            if (err) {
              return fin(err)
            }

            seneca.make('sys', 'product')
              .data$({ id$: my_product_id, label: 'nauta sagittas portat' })
              .save$((err, _out) => {
                if (err) {
                  return fin(err)
                }

                return fin(new Error('Expected an error to be thrown'))
              })
          })
      })
    })

    describe('when data.id$ is null', () => {
      const seneca = makeSenecaForTest()

      before(() => new Promise(fin => seneca.ready(fin)))


      before(() => {
        return seneca.make('sys', 'product')
          .data$({ id$: null, label: 'lorem ipsum' })
          .save$()
      })

      it('generates an id and creates a new entity', fin => {
        seneca.test(fin)

        seneca.make('sys', 'product')
          .load$(null, (err, out) => {
            if (err) {
              return fin(err)
            }

            expect(out).to.be.undefined()

            return seneca.make('sys', 'product')
              .list$((err, products) => {
                if (err) {
                  return fin(err)
                }

                expect(products.length).to.equal(1)

                expect(typeof products[0].id).to.equal('string')
                expect(products[0].label).to.equal('lorem ipsum')

                return fin()
              })
          })
      })
    })

    describe('when "generate_id" returns null', () => {
      const seneca = makeSenecaForTest({
        mem_store_opts: {
          generate_id(_ent) {
            return null
          }
        }
      })

      before(() => new Promise(fin => seneca.ready(fin)))


      before(() => {
        return seneca.make('sys', 'product')
          .data$({ label: 'lorem ipsum' })
          .save$()
      })

      it('generates a new id and creates a new entity', fin => {
        seneca.test(fin)

        seneca.make('sys', 'product')
          .load$(null, (err, out) => {
            if (err) {
              return fin(err)
            }

            expect(out).to.be.undefined()

            return seneca.make('sys', 'product')
              .list$((err, products) => {
                if (err) {
                  return fin(err)
                }

                expect(products.length).to.equal(1)

                expect(typeof products[0].id).to.equal('string')
                expect(products[0].label).to.equal('lorem ipsum')

                return fin()
              })
          })
      })
    })

    describe('the "entity$" field when saving an entity', () => {
      const seneca = makeSenecaForTest()

      before(() => new Promise(fin => seneca.ready(fin)))


      it('stores the "entity$" field with each entity', fin => {
        const product_ent = seneca.entity('default_zone', 'sys', 'product')

        product_ent
          .data$({})
          .save$((err, saved_product) => {
            if (err) {
              return fin(err)
            }

            if (null == saved_product) {
              return fin(new Error('Expected the product to be saved'))
            }

            if (null == saved_product.id) {
              return fin(new Error('Expected the saved product to have an id'))
            }

            try {
              expect(saved_product.entity$).to.equal('default_zone/sys/product')
            } catch (err) {
              return fin(err)
            }

            const { id: product_id } = saved_product

            product_ent
              .load$(product_id, (err, product) => {
                if (err) {
                  return fin(err)
                }

                try {
                  expect(product.entity$).to.equal('default_zone/sys/product')
                } catch (err) {
                  return fin(err)
                }

                return fin()
              })
          })
      })
    })
  })

  describe('logging', () => {
    describe('#save', () => {
      const all_logs = []

      before(() => {
        bufferSenecaLogsOnStdout(all_logs)
      })

      after(() => {
        // NOTE: Restore the stdout here too, in case an uncaught error
        // is thrown.
        //
        restoreStdout()
      })


      let seneca

      before(() => {
        seneca = makeSenecaForTestOfLogging()
      })

      before(() => new Promise(fin => seneca.ready(fin)))


      testThatLogging('logs the operation', fin => {
        const product_ent = seneca.make('products')

        product_ent
          .save$((err, product) => {
            if (err) {
              return fin(err)
            }

            try {
              const debug_logs = all_logs
                .filter(log => 'debug' === log.level_name)

              const save_log = debug_logs.find(log => {
                return Array.isArray(log.data) &&
                  'string' === typeof log.data[0] &&
                  log.data[0].startsWith('save/')
              })


              expect(save_log).to.exist()
              expect(save_log.data.length).to.equal(4)

              const [, log_ent_canon, log_mement, log_desc] = save_log.data

              expect(log_ent_canon).to.equal('-/-/products')

              expect(log_mement).to.contain({
                entity$: '-/-/products',
                id: product.id
              })

              expect(log_desc).to.startWith('mem-store')

              return fin()
            } catch (err) {
              return fin(err)
            }
          })
      })
    })

    describe('#load', () => {
      const all_logs = []

      before(() => {
        bufferSenecaLogsOnStdout(all_logs)
      })

      after(() => {
        // NOTE: Restore the stdout here too, in case an uncaught error
        // is thrown.
        //
        restoreStdout()
      })


      let seneca

      before(() => {
        seneca = makeSenecaForTestOfLogging()
      })

      before(() => new Promise(fin => seneca.ready(fin)))




      let product_id

      before(() => new Promise((resolve, reject) => {
        seneca.make('products')
          .save$((err, product) => {
            if (err) {
              return reject(err)
            }

            product_id = product.id

            return resolve()
          })
      }))


      testThatLogging('logs the operation', fin => {
        const product_ent = seneca.make('products')

        product_ent
          .load$(product_id, (err, product) => {
            if (err) {
              return fin(err)
            }

            try {
              const debug_logs = all_logs
                .filter(log => 'debug' === log.level_name)

              const save_log = debug_logs.find(log => {
                return Array.isArray(log.data) &&
                  'string' === typeof log.data[0] &&
                  log.data[0].startsWith('load')
              })


              expect(save_log).to.exist()
              expect(save_log.data.length).to.equal(5)

              const [, , log_ent_canon, log_mement, log_desc] = save_log.data

              expect(log_ent_canon).to.equal('-/-/products')

              expect(log_mement).to.contain({
                entity$: '-/-/products',
                id: product.id
              })

              expect(log_desc).to.startWith('mem-store')

              return fin()
            } catch (err) {
              return fin(err)
            }
          })
      })
    })


    const writeToStdout = process.stdout.write

    function bufferSenecaLogsOnStdout(out_logs) {
      process.stdout.write = out => {
        const log = (() => {
          try {
            return JSON.parse(out)
          } catch (_err) {
            return null
          }
        })()


        const is_log = (null == log) || !('level_name' in log)

        if (is_log) {
          return writeToStdout.call(process.stdout, out)
        }


        out_logs.push(log)
      }
    }

    function restoreStdout() {
      process.stdout.write = writeToStdout
    }

    function testThatLogging(desc, test) {
      it(desc, fin => {
        test((err = null) => {
          // NOTE: This allows test output to show after the test ends.
          //
          restoreStdout()

          return fin(err)
        })
      })
    }

    function makeSenecaForTestOfLogging() {
      return makeSenecaForTest({ seneca_opts: { log: 'debug' } })
    }
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

