/* Copyright (c) 2010-2020 Richard Rodger and other contributors, MIT License */
'use strict'

import * as Intern from './lib/intern'

let internals = {
  name: 'mem-store'
}

module.exports = mem_store
Object.defineProperty(module.exports, 'name', { value: 'mem-store' })

module.exports.defaults = {
  'entity-id-exists':
    'Entity of type <%=type%> with id = <%=id%> already exists.',
}

/* NOTE: `intern` serves as a namespace for utility functions used by
 * the mem store.
 */
module.exports.intern = Intern

function mem_store(this: any, options: any) {
  let seneca: any = this

  let init = seneca.export('entity/init')

  // merge default options with any provided by the caller
  options = seneca.util.deepextend(
    {
      prefix: '/mem-store',
      web: {
        dump: false,
      },

      // TODO: use seneca.export once it allows for null values
      generate_id: seneca.root.private$.exports['entity/generate_id'],
    },
    options
  )

  // The calling Seneca instance will provide
  // a description for us on init(), it will
  // be used in the logs
  let desc: any

  // Our super awesome in mem database. Please bear in mind
  // that this store is meant for fast prototyping, using
  // it for production is not advised!
  let entmap: any = {}

  // Define the store using a description object.
  // This is a convenience provided by seneca.store.init function.
  let store = {
    // The name of the plugin, this is what is the name you would
    // use in seneca.use(), eg seneca.use('mem-store').
    name: internals.name,

    save: function(this: any, msg: any, reply: any) {
      // Take a reference to Seneca
      // and the entity to save
      let seneca = this
      let ent = msg.ent

      // create our cannon and take a copy of
      // the zone, base and name, we will use
      // this info further down.
      let canon = ent.canon$({ object: true })
      let zone = canon.zone
      let base = canon.base
      let name = canon.name

      // check if we are in create mode,
      // if we are do a create, otherwise
      // we will do a save instead
      //
      const is_new = Intern.is_new(ent)

      return is_new ? do_create() : do_save()

      // The actual save logic for saving or
      // creating and then saving the entity.
      function do_save(id?: any, isnew?: boolean) {
        let mement = ent.data$(true, 'string')

        if (undefined !== id) {
          mement.id = id
        }

        mement.entity$ = ent.entity$

        entmap[base] = entmap[base] || {}
        entmap[base][name] = entmap[base][name] || {}

        let prev = entmap[base][name][mement.id]
        if (isnew && prev) {
          return reply(
            seneca.fail('entity-id-exists', { type: ent.entity$, id: id })
          )
        }

        mement = seneca.util.deep(mement)
        const should_merge = Intern.should_merge(ent, options)

        if (should_merge) {
          mement = Object.assign(prev || {}, mement)
        }

        if (Intern.is_upsert_requested(msg)) {
          const upsert_on = seneca.util.clean(msg.q.upsert$)

          if (upsert_on.length > 0) {
            const public_entdata = ent.data$(false)
            const may_match = upsert_on.every((p: string) => p in public_entdata)

            if (may_match) {
              const match_by = upsert_on.reduce((h: any, p: string) => {
                h[p] = public_entdata[p]
                return h
              }, {})

              const updated_doc = Intern.update_one_doc(entmap, ent, match_by, public_entdata)

              if (updated_doc) {
                return reply(null, ent.make$(updated_doc))
              }
            }
          }
        }

        prev = entmap[base][name][mement.id] = mement

        seneca.log.debug(function() {
          return [
            'save/' + (Intern.is_new(msg.ent) ? 'insert' : 'update'),
            ent.canon$({ string: 1 }),
            mement,
            desc,
          ]
        })

        return reply(null, ent.make$(prev))
      }

      // We will still use do_save to save the entity but
      // we need a place to handle new entites and id concerns.
      function do_create() {
        let id

        // Check if we already have an id or if
        // we need to generate a new one.
        if (undefined !== ent.id$) {
          // Take a copy of the existing id and
          // delete it from the ent object. Do
          // save will handle the id for us.
          id = ent.id$
          delete ent.id$

          // Save with the existing id
          return do_save(id, true)
        }

        // Generate a new id
        id = options.generate_id ? options.generate_id(ent) : void 0

        if (undefined !== id) {
          return do_save(id, true)
        } else {
          let gen_id = {
            role: 'basic',
            cmd: 'generate_id',
            name: name,
            base: base,
            zone: zone,
          }

          // When we get a respones we will use the id param
          // as our entity id, if this fails we just fail and
          // call reply() as we have no way to save without an id
          seneca.act(gen_id, function(err: Error, id: string) {
            if (err) return reply(err)
            do_save(id, true)
          })
        }
      }
    },

    load: function(this: any, msg: any, reply: any) {
      let qent = msg.qent
      let q = msg.q

      return Intern.listents(this, entmap, qent, q, function(this: any, err: any, list: any[]) {
        let ent = list[0] || null

        this.log.debug(function() {
          return ['load', q, qent.canon$({ string: 1 }), ent, desc]
        })

        reply(err, ent)
      })
    },

    list: function(msg: any, reply: any) {
      let qent = msg.qent
      let q = msg.q

      return Intern.listents(this, entmap, qent, q, function(this: any, err: any, list: any[]) {
        this.log.debug(function() {
          return [
            'list',
            q,
            qent.canon$({ string: 1 }),
            list.length,
            list[0],
            desc,
          ]
        })

        reply(err, list)
      })
    },

    remove: function(this: any, msg: any, reply: any) {
      let seneca = this
      let qent = msg.qent
      let q = msg.q
      let all = q.all$

      // default false
      let load = q.load$ === true

      return Intern.listents(seneca, entmap, qent, q, function(err: Error, list: any[]) {
        if (err) {
          return reply(err)
        }

        list = list || []
        list = all ? list : list.slice(0, 1)

        list.forEach(function(ent) {
          let canon = qent.canon$({
            object: true,
          })

          delete entmap[canon.base][canon.name][ent.id]

          seneca.log.debug(function() {
            return [
              'remove/' + (all ? 'all' : 'one'),
              q,
              qent.canon$({ string: 1 }),
              ent,
              desc,
            ]
          })
        })

        let ent = (!all && load && list[0]) || null

        reply(null, ent)
      })
    },

    close: function(this: any, _msg: any, reply: any) {
      this.log.debug('close', desc)
      reply()
    },

    // .native() is used to handle calls to the underlying driver. Since
    // there is no underlying driver for mem-store we simply return the
    // default entityMap object.
    native: function(this: any, _msg: any, reply: any) {
      reply(null, entmap)
    },
  }

  // Init the store using the seneca instance, merged
  // options and the store description object above.
  let meta = init(seneca, options, store)
  //let meta = seneca.store.init(seneca, options, store)

  // int() returns some metadata for us, one of these is the
  // description, we'll take a copy of that here.
  desc = meta.desc

  options.idlen = options.idlen || 6

  seneca.add(
    { role: store.name, cmd: 'dump' },
    function(_msg: any, reply: any) {
      reply(null, entmap)
    }
  )

  seneca.add(
    { role: store.name, cmd: 'export' },
    function(_msg: any, reply: any) {
      let entjson = JSON.stringify(entmap)

      reply(null, { json: entjson })
    }
  )

  // TODO: support direct import of literal objects
  seneca.add(
    { role: store.name, cmd: 'import' },
    function(this: any, msg: any, reply: any) {
      let imported = JSON.parse(msg.json)
      entmap = msg.merge ? this.util.deepextend(entmap, imported) : imported
      reply()
    }
  )

  // Seneca will call init:plugin-name for us. This makes
  // this action a great place to do any setup.
  //seneca.add('init:mem-store', function (msg, reply) {
  seneca.init(function(this: any, reply: any) {
    if (options.web.dump) {
      this.act('role:web', {
        use: {
          prefix: options.prefix,
          pin: { role: 'mem-store', cmd: '*' },
          map: { dump: true },
        },
        default$: {},
      })
    }

    return reply()
  })

  // We don't return the store itself, it will self load into Seneca via the
  // init() function. Instead we return a simple object with the stores name
  // and generated meta tag.
  return {
    name: store.name,
    tag: meta.tag,
    exportmap: {
      native: entmap,
    },
  }
}

module.exports.preload = function() {
  let seneca = this

  let meta = {
    name: internals.name,
    exportmap: {
      native: function() {
        seneca.export(internals.name + '/native').apply(this, arguments)
      },
    },
  }

  return meta
}

