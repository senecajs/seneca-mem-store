/*
  MIT License,
  Copyright (c) 2015, Richard Rodger and other contributors.
  Copyright (c) 2010-2014, Richard Rodger.
*/

'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('seneca')
var MemStore = require('../mem-store')
var Shared = require('seneca-store-test')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var seneca = Seneca({
  log: 'silent',
  default_plugins: {'mem-store': false}
})

seneca.use(MemStore)

describe('mem-store tests', function () {
  Shared.basictest({
    seneca: seneca,
    script: lab
  })

  it('custom tests', function (done) {
    seneca.options({errhandler: done})

    var ent = seneca.make('foo', {id$: '0', q: 1})

    ent.save$(function (err) {
      Assert.ok(null === err)

      seneca.act('role:mem-store, cmd:export', function (err, exported) {
        var expected = '{"undefined":{"foo":{"0":{"entity$":"-/-/foo","q":1,"id":"0"}}}}'

        Assert.ok(null === err)
        Assert.equal(exported.json, expected)

        var data = JSON.parse(exported.json)
        data['undefined']['foo']['1'] = { 'entity$': '-/-/foo', 'val': 2, 'id': '1'}

        seneca.act('role:mem-store, cmd:import', {json: JSON.stringify(data)}, function (err) {
          Assert.ok(null === err)

          seneca.make('foo').load$('1', function (err, foo) {
            Assert.ok(null === err)
            Assert.equal(2, foo.val)

            done()
          })
        })
      })
    })
  })
})
