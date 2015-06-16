/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
"use strict";


var assert = require('assert')

var seneca = require('seneca')

var shared = require('seneca-store-test')


var si = seneca({log:'silent'})
si.use('../mem-store.js')

si.__testcount = 0
var testcount = 0


describe('mem', function(){
  it('basic', function(fin){
    testcount++
    shared.basictest(si,fin)
  })

  it('custom', function(fin){
    si.options({errhandler:fin})
    si.make('foo',{id$:"0",q:1}).save$(function(err){

      si.act('role:mem-store,cmd:export',function(e,out){
        assert.ok( null == e )
        assert.equal( out.json, '{"undefined":{"foo":{"0":{"entity$":"-/-/foo"'+
                      ',"q":1,"id":"0"}}},"moon":{"bar":{}}}' )

        var data = JSON.parse(out.json)
        data["undefined"]["foo"]["1"] = {"entity$":"-/-/foo","z":2,"id":"1"} 

        si.act(
          'role:mem-store,cmd:import',{json:JSON.stringify(data)},
          function(e){
            si.make('foo').load$("1",function(e,f1){

              assert.equal(2,f1.z)
              fin()
            })
          })
      })
    })
  })

  it('close', function(fin){
    shared.closetest(si,testcount,fin)
  })
})
