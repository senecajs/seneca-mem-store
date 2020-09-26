/*
  MIT License,
  Copyright (c) 2010-2019, Richard Rodger and other contributors.
*/

'use strict'

const Util = require('util')

const Assert = require('assert')
const Seneca = require('seneca')
const Shared = require('seneca-store-test')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const lab = (exports.lab = Lab.script())
const expect = Code.expect

const describe = lab.describe
const it = make_it(lab)
const before = lab.before

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


const seneca_test = Seneca({
  log: 'silent',
})
      .use('promisify')
      .use('entity', {mem_store: false})
      .use('..')

const test_opts = {
  seneca:seneca_test,
  name:'mem-store'
}


Shared.test.init(lab,test_opts)
Shared.test.keyvalue(lab,test_opts)


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

        foo0.load$({ id: 'f0', fields$: ['a', 'not-a-fields'] }, function (
          err,
          out
        ) {
          expect(out.toString()).equal('$-/-/foo;id=f0;{a:1}')
          fin()
        })
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
