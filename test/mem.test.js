/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var assert = require('assert')
var Lab = require('lab')
var Seneca = require('seneca')
var Shared = require('seneca-store-test')

// Shortcults
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var MemStore = require('..')

var si = Seneca({
  log: 'silent'
})

si.use(MemStore)

describe('mem', function () {
  Shared.basictest({
    seneca: si,
    script: lab
  })

  it('custom test', function (done) {
    si.options({
      errhandler: done
    })

    si.make('foo', {
      id$: '0',
      q: 1
    }).save$(function (err) {
      assert.ok(err === null)
      si.act('role:mem-store,cmd:export', function (e, out) {
        assert.ok(e == null)
        assert.equal(out.json, '{"undefined":{"foo":{"0":{"entity$":"-/-/foo"' +
          ',"q":1,"id":"0"}}}}')

        var data = JSON.parse(out.json)
        data['undefined']['foo']['1'] = {
          'entity$': '-/-/foo',
          z: 2,
          id: '1'
        }

        si.act(
          'role:mem-store,cmd:import', {
            json: JSON.stringify(data)
          },
          function (e) {
            si.make('foo').load$('1', function (e, f1) {
              assert.equal(2, f1.z)
              done()
            })
          })
      })
    })
  })
})
