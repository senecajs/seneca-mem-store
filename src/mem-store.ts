/* Copyright (c) 2010-2022 Richard Rodger and other contributors, MIT License */
'use strict'

// TODO: use `undefined` as no-error value consistently

import { intern } from './intern'

let internals = {
  name: 'mem-store',
}

type Options = {
  prefix?: string
  idlen?: number
  web?: {
    dump: boolean
  }
  generate_id?: any
}

function mem_store(this: any, options: Options) {
  let seneca: any = this

  let init = seneca.export('entity/init')

  // merge default options with any provided by the caller
  options = seneca.util.deepextend(
    {
      prefix: '/mem-store',
      idlen: 6,
      web: {
        dump: false,
      },

      // TODO: use seneca.export once it allows for null values
      generate_id: seneca.root.private$.exports['entity/generate_id'],
    },
    options,
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

    save: function (this: any, msg: any, reply: any) {
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
      const is_new = intern.is_new(ent)

      return is_new ? do_create() : do_save()

      // The actual save logic for saving or
      // creating and then saving the entity.
      function do_save(id?: any, isnew?: boolean) {
        entmap[base] = entmap[base] || {}
        entmap[base][name] = entmap[base][name] || {}

        // NOTE: It looks like `ent` is stripped of any private fields
        // at this point, hence the `ent.data$(true)` does not actually
        // leak private fields into saved entities. The line of code in
        // the snippet below, for example, does not save the user.psst$
        // field along with the entity:
        //
        // app.make('user').data$({ psst$: 'private' }).save$()
        //
        // This can be verified by logging the mement object below.
        //
        const mement = ent.data$(true, 'string')

        let mement_ptr: any = null
        let operation: string | null = null

        if (intern.is_upsert(msg)) {
          operation = 'upsert'
          mement_ptr = try_upsert(mement, msg)
        }

        if (null == mement_ptr) {
          operation = intern.is_new(msg.ent) ? 'insert' : 'update'
          mement_ptr = complete_save(mement, msg, id, isnew)
        }

        const result_mement = seneca.util.deep(mement_ptr)
        const result_ent = ent.make$(result_mement)

        seneca.log.debug(
          'save/' + operation,
          ent.canon$({ string: 1 }),
          mement_ptr,
          desc,
        )

        return reply(null, result_ent)

        function try_upsert(mement: any, msg: any) {
          const { q, ent } = msg
          const upsert_on = intern.clean_array(q.upsert$)

          if (0 < upsert_on.length) {
            const has_upsert_fields = upsert_on.every(
              (p: string) => p in mement,
            )

            if (has_upsert_fields) {
              const match_by = upsert_on.reduce((h: any, p: string) => {
                h[p] = mement[p]
                return h
              }, {})

              const updated_ent = intern.update_mement(
                entmap,
                ent,
                match_by,
                mement,
              )

              return updated_ent
            }
          }

          return null
        }

        function complete_save(
          mement: any,
          msg: any,
          id?: any,
          isnew?: boolean,
        ) {
          const { ent } = msg

          if (null != id) {
            mement.id = id
          }

          const prev = entmap[base][name][mement.id]

          if (isnew && prev) {
            seneca.fail('entity-id-exists', {
              type: ent.entity$,
              id: mement.id,
            })
            return
          }

          const should_merge = intern.should_merge(ent, options)

          if (should_merge) {
            mement = Object.assign(prev || {}, mement)
          }

          entmap[base][name][mement.id] = mement

          return mement
        }
      }

      // We will still use do_save to save the entity but
      // we need a place to handle new entites and id concerns.
      function do_create() {
        let id

        // Check if we already have an id or if
        // we need to generate a new one.
        if (null != ent.id$) {
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

        if (null == id) {
          seneca.fail('generate-invalid-entity-id', {
            type: ent.entity$,
            id: id,
          })
        } else {
          return do_save(id, true)
        }
      }
    },

    load: function (this: any, msg: any, reply: any) {
      let qent = msg.qent
      let q = msg.q || {}

      return intern.listents(
        this,
        entmap,
        qent,
        q,
        function (this: any, err: any, list: any[]) {
          let ent = list[0] || null

          this.log.debug('load', q, qent.canon$({ string: 1 }), ent, desc)

          reply(err, ent)
        },
      )
    },

    list: function (msg: any, reply: any) {
      let qent = msg.qent
      let q = msg.q || {}

      return intern.listents(
        this,
        entmap,
        qent,
        q,
        function (this: any, err: any, list: any[]) {
          this.log.debug(
            'list',
            q,
            qent.canon$({ string: 1 }),
            list.length,
            list[0],
            desc,
          )

          reply(err, list)
        },
      )
    },

    remove: function (this: any, msg: any, reply: any) {
      let seneca = this
      let qent = msg.qent
      let q = msg.q || {}
      let all = q.all$

      // default false
      let load = q.load$ === true

      return intern.listents(
        seneca,
        entmap,
        qent,
        q,
        function (err: Error, list: any[]) {
          if (err) {
            return reply(err)
          }

          list = list || []
          list = all ? list : list.slice(0, 1)

          list.forEach(function (ent) {
            let canon = qent.canon$({
              object: true,
            })

            delete entmap[canon.base][canon.name][ent.id]

            seneca.log.debug(
              'remove/' + (all ? 'all' : 'one'),
              q,
              qent.canon$({ string: 1 }),
              ent,
              desc,
            )
          })

          let ent = (!all && load && list[0]) || null

          reply(null, ent)
        },
      )
    },

    close: function (this: any, _msg: any, reply: any) {
      this.log.debug('close', desc)
      reply()
    },

    // .native() is used to handle calls to the underlying driver. Since
    // there is no underlying driver for mem-store we simply return the
    // default entityMap object.
    native: function (this: any, _msg: any, reply: any) {
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

  seneca.add(
    { role: store.name, cmd: 'dump' },
    function (_msg: any, reply: any) {
      reply(null, entmap)
    },
  )

  seneca.add(
    { role: store.name, cmd: 'export' },
    function (_msg: any, reply: any) {
      let entjson = JSON.stringify(entmap)

      reply(null, { json: entjson })
    },
  )

  // TODO: support direct import of literal objects
  seneca.add(
    { role: store.name, cmd: 'import' },
    function (this: any, msg: any, reply: any) {
      let imported = JSON.parse(msg.json)
      entmap = msg.merge ? this.util.deepextend(entmap, imported) : imported
      reply()
    },
  )

  // Seneca will call init:plugin-name for us. This makes
  // this action a great place to do any setup.
  //seneca.add('init:mem-store', function (msg, reply) {
  seneca.init(function (this: any, reply: any) {
    if (options?.web?.dump) {
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

mem_store.preload = function (this: any) {
  let seneca = this

  let meta = {
    name: internals.name,
    exportmap: {
      native: function () {
        seneca.export(internals.name + '/native').apply(this, arguments)
      },
    },
  }

  return meta
}

mem_store.defaults = {
  'entity-id-exists':
    'Entity of type <%=type%> with id = <%=id%> already exists.',
}

/* NOTE: `intern` serves as a namespace for utility functions used by
 * the mem store.
 */
mem_store.intern = intern

Object.defineProperty(mem_store, 'name', { value: 'mem-store' })

export default mem_store

if ('undefined' !== typeof module) {
  module.exports = mem_store
}
