/*
  MIT License,
  Copyright (c) 2010-2014 Richard Rodger,
  Copyright (c) 2015 Richard Rodger and Senecajs.org contributors
*/

'use strict'

var _ = require('lodash')

module.exports = function (options) {
  var seneca = this

  // merge default options with any provided by the caller
  options = seneca.util.deepextend({prefix: '/mem-store', web: {dump: false}}, options)

  // The calling Seneca instance will provide
  // a description for us on init(), it will
  // be used in the logs
  var desc

  // Our super awesome in mem database. Please bear in mind
  // that this store is meant for fast prototyping, using
  // it for production is not advised!
  var entmap = {}

  // Define the store using a description object.
  // This is a convenience provided by seneca.store.init function.
  var store = {

    // The name of the plugin, this is what is the name you would
    // use in seneca.use(), eg seneca.use('mem-store').
    name: 'mem-store',

    save: function (args, cb) {

      // Take a reference to Seneca
      // and the entity to save
      var si = this
      var ent = args.ent

      // create our cannon and take a copy of
      // the zone, base and name, we will use
      // this info further down.
      var canon = ent.canon$({object: true})
      var zone = canon.zone
      var base = canon.base
      var name = canon.name

      // check if we are in create mode,
      // if we are do a create, otherwise
      // we will do a save instead
      var create = ent.id == null
      if (create) {
        create_new()
      } else {
        do_save()
      }

      // The actual save logic for saving or
      // creating and then saving the entity.
      function do_save (id, isnew) {
        var mement = ent.data$(true, 'string')

        if (id !== undefined) {
          mement.id = id
        }

        mement.entity$ = ent.entity$

        entmap[base] = entmap[base] || {}
        entmap[base][name] = entmap[base][name] || {}

        var prev = entmap[base][name][mement.id]
        if (isnew && prev) {
          return cb(new Error('Entity of type ' + ent.entity$ + ' with id = ' + id + ' already exists.'))
        }

        prev = entmap[base][name][mement.id] = _.cloneDeep(mement)

        si.log.debug(function () {
          return ['save/' + (create ? 'insert' : 'update'), ent.canon$({string: 1}), mement, desc]
        })

        cb(null, ent.make$(prev))
      }

      // We will still use do_save to save the entity but
      // we need a place to handle new entites and id concerns.
      function create_new () {

        // Check if we already have an id or if
        // we need to generate a new one.
        if (ent.id$ !== undefined) {

          // Take a copy of the existing id and
          // delete it from the ent object. Do
          // save will handle the id for us.
          var id = ent.id$
          delete ent.id$

          // Save with the existing id
          return do_save(id, true)
        }

        // We need an id so we will call out
        // to Seneca for one.
        var gen_id = {
          role: 'basic',
          cmd: 'generate_id',
          name: name,
          base: base,
          zone: zone
        }

        // When we get a respones we will use the id param
        // as our entity id, if this fails we just fail and
        // call cb() as we have no way to save without an id
        si.act(gen_id, function (err, id) {
          if (err) {
            cb(err)
          } else {
            do_save(id, true)
          }
        })
      }
    },

    load: function (args, cb) {
      var qent = args.qent
      var q = args.q

      listents(this, entmap, qent, q, function (err, list) {
        var ent = list[0] || null

        this.log.debug(function () {
          return [ 'load', q, qent.canon$({string: 1}), ent, desc ]
        })

        cb(err, ent)
      })
    },

    list: function (args, cb) {

      var qent = args.qent
      var q = args.q

      listents(this, entmap, qent, q, function (err, list) {

        this.log.debug(function () {
          return ['list', q, qent.canon$({string: 1}), list.length, list[0], desc]
        })

        cb(err, list)
      })
    },

    remove: function (args, cb) {
      var seneca = this
      var qent = args.qent
      var q = args.q
      var all = q.all$

      // default true
      var load = q.load$ !== false

      listents(seneca, entmap, qent, q, function (err, list) {
        if (err) {
          return cb(err)
        }

        list = list || []
        list = all ? list : list.slice(0, 1)

        list.forEach(function (ent) {
          var canon = qent.canon$({
            object: true
          })

          delete entmap[canon.base][canon.name][ent.id]

          seneca.log.debug(function () {
            return ['remove/' + (all ? 'all' : 'one'), q, qent.canon$({string: 1}), ent, desc]
          })
        })

        var ent = !all && load && list[0] || null

        cb(null, ent)
      })
    },

    close: function (args, cb) {
      this.log.debug('close', desc)
      cb()
    },

    // .native() is used to handle calls to the underlying driver. Since
    // there is no underlying driver for mem-store we simply return the
    // default entityMap object.
    native: function (args, cb) {
      cb(null, entmap)
    }
  }

  // Init the store using the seneca instance, merged
  // options and the store description object above.
  var meta = seneca.store.init(seneca, options, store)

  // int() returns some metadata for us, one of these is the
  // description, we'll take a copy of that here.
  desc = meta.desc

  options.idlen = options.idlen || 6

  seneca.add({role: store.name, cmd: 'dump'}, function (args, cb) {
    cb(null, entmap)
  })

  seneca.add({role: store.name, cmd: 'export'}, function (args, done) {
    var entjson = JSON.stringify(entmap)

    done(null, {json: entjson})
  })

  seneca.add({role: store.name, cmd: 'import'}, function (args, done) {
    try {
      entmap = JSON.parse(args.json)
      done()
    } catch (e) {
      done(e)
    }
  })

  seneca.add('init:mem-store', function (args, done) {
    if (options.web.dump) {
      seneca.act('role:web', {
        use: {
          prefix: options.prefix,
          pin: {role: 'mem-store', cmd: '*'},
          map: {dump: true}
        }
      })
    }

    return done()
  })

  // We don't return the store itself, it will self load into Seneca via the
  // init() function. Instead we return a simple object with the stores name
  // and generated meta tag.
  return {
    name: store.name,
    tag: meta.tag
  }
}

// Seneca supports a reasonable set of features
// in terms of listing. This function can handle
// sorting, skiping, limiting and general retrieval.
function listents (si, entmap, qent, q, cb) {
  var list = []

  var canon = qent.canon$({object: true})
  var base = canon.base
  var name = canon.name

  var entset = entmap[base] ? entmap[base][name] : null

  if (entset) {
    _.keys(entset).forEach(function (id) {
      var ent = entset[id]

      for (var p in q) {
        if (!~p.indexOf('$') && q[p] !== ent[p]) {
          return
        }
      }

      ent = qent.make$(ent)
      list.push(ent)
    })
  }

  // Always sort first, this is the 'expected' behaviour.
  if (q.sort$) {
    for (var sf in q.sort$) {
      break
    }

    var sd = q.sort$[sf] < 0 ? -1 : 1
    list = list.sort(function (a, b) {
      return sd * (a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1)
    })
  }

  // Skip before limiting.
  if (q.skip$) {
    list = list.slice(q.skip$)
  }

  // Limited the possibly sorted and skipped list.
  if (q.limit$) {
    list = list.slice(0, q.limit$)
  }

  // Return the resulting list to the caller.
  cb.call(si, null, list)
}
