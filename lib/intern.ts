export class intern {
  static is_new(ent: any): boolean {
    // NOTE: This function is intended for use by the #save method. This
    // function returns true when the entity argument is assumed to not yet
    // exist in the store.
    //
    // In terms of code, if client code looks like so:
    // ```
    //   seneca.make('product')
    //     .data$({ label, price })
    //     .save$(done)
    // ```
    //
    // - `is_new` will be invoked from the #save method and return
    // true, because the product entity is yet to be saved.
    //
    // The following client code will cause `is_new` to return false,
    // when invoked from the #save method, because the user entity already
    // exists:
    // ```
    //   seneca.make('user')
    //     .load$(user_id, (err, user) => {
    //       if (err) return done(err)
    //
    //       return user
    //         .data$({ email, username })
    //         .save$(done)
    //     })
    // ```
    // 
    return null != ent && null == ent.id
  }


  static is_upsert(msg: any): boolean {
    const { ent, q } = msg
    return intern.is_new(ent) && Array.isArray(q.upsert$)
  }


  static find_mement(entmap: any, base_ent: any, filter: any): any {
    const { base, name } = base_ent.canon$({ object: true })
    const entset = entmap[base] && entmap[base][name]

    if (null == entset) {
      return null
    }


    let out = null

    for (const ent_id in entset) {
      const mement = entset[ent_id]

      if (matches(mement, filter)) {
        out = mement
        break
      }
    }

    return out


    function matches(ent: any, filter: any): boolean {
      for (const fp in filter) {
        if (fp in ent && filter[fp] === ent[fp]) {
          continue
        }

        return false
      }

      return true
    }
  }


  static update_mement(entmap: any, base_ent: any, filter: any, new_attrs: any) {
    const ent_to_update = intern.find_mement(entmap, base_ent, filter)

    if (ent_to_update) {
      Object.assign(ent_to_update, new_attrs)
      return ent_to_update
    }

    return null
  }


  static should_merge(ent: any, plugin_opts: any): boolean {
    return !(false === plugin_opts.merge || false === ent.merge$)
  }


  static is_object(x: any): boolean {
    return '[object Object]' === toString.call(x)
  }


  static is_date(x: any): boolean {
    return '[object Date]' === toString.call(x)
  }


  static eq_dates(lv: Date, rv: Date): boolean {
    return lv.getTime() === rv.getTime()
  }


  static matches_qobj(q: any, mement: any): boolean {
    if (null == q || 'object' !== typeof q) {
      throw new Error('The q argument must be an object')
    }


    const qprops = Object.keys(q)


    // NOTE: If the query is an empty object, then we are matching
    // all entities.

    if (0 === qprops.length) {
      return true
    }


    const does_match = qprops.every(qp => {
      const qv = q[qp]


      if ('and$' === qp) {
        if (!Array.isArray(qv)) {
          throw new Error('The and$-operator must be an array')
        }

        return qv.every(subq => intern.matches_qobj(subq, mement))
      }


      if ('or$' === qp) {
        if (!Array.isArray(qv)) {
          throw new Error('The or$-operator must be an array')
        }

        return qv.some(subq => intern.matches_qobj(subq, mement))
      }


      if (-1 !== qp.indexOf('$')) {
        //
        // NOTE: We ignore Seneca qualifiers.
        //
        return true
      }


      if (!(qp in mement)) {
        return false
      }


      const ev = mement[qp]

      if (Array.isArray(qv)) {
        return -1 !== qv.indexOf(ev)
      }


      if (null != qv && 'object' === typeof qv) {
        const qops = Object.keys(qv)

        const does_satisfy_ops = qops.every(op => {
          // NOTE: This is the legacy mongo-style constraints.
          //

          if ('$ne' === op)   return ev != qv[op]
          if ('$gte' === op)  return ev >= qv[op]
          if ('$gt' === op)   return ev > qv[op]
          if ('$lt' === op)   return ev < qv[op]
          if ('$lte' === op)  return ev <= qv[op]
          if ('$in' === op)   return qv[op].includes(ev)
          if ('$nin' === op)  return !qv[op].includes(ev)

          //
          // NOTE: The definition for the legacy mongo-style constraints
          // ends here.


          if ('eq$' === op)   return ev === qv.eq$
          if ('ne$' === op)   return ev !== qv.ne$
          if ('gte$' === op)  return ev >= qv.gte$
          if ('gt$' === op)   return ev > qv.gt$
          if ('lt$' === op)   return ev < qv.lt$
          if ('lte$' === op)  return ev <= qv.lte$
          if ('in$' === op)   return qv.in$.includes(ev)
          if ('nin$' === op)  return !qv.nin$.includes(ev)


          // NOTE: We ignore unknown constraints.
          //

          return true
        })

        return does_satisfy_ops
      }


      if (intern.is_date(qv)) {
        return intern.is_date(ev) && intern.eq_dates(qv, ev)
      }


      return qv === ev
    })


    return does_match
  }


  // NOTE: Seneca supports a reasonable set of features
  // in terms of listing. This function can handle
  // sorting, skiping, limiting and general retrieval.
  //
  static listents(seneca: any, entmap: any, qent: any, q: any, done: any) {
    let list: any = []

    const canon = qent.canon$({ object: true })
    const { base, name } = canon

    const entset = entmap[base] ? entmap[base][name] : null

    if (null != entset && null != q) {
      if ('string' == typeof q) {
        const match = entset[q]

        if (match) {
          // TODO: FIXME:
          //const ent = qent.make$(match)
          list.push(match)
        }
      } else if (Array.isArray(q)) {
        for (const id of q) {
          const match = entset[id]

          if (match) {
            const ent = qent.make$(match)
            list.push(ent)
          }
        }
      } else if ('object' === typeof q) {
        const ents = Object.values(entset)
        const matches = ents.filter(ent => intern.matches_qobj(q, ent))
        const out = matches.map(match => qent.make$(match))

        list = list.concat(out)
      }
    }

    // Always sort first, this is the 'expected' behaviour.
    if (null != q && q.sort$) {
      let sf: any
      for (sf in q.sort$) {
        break
      }

      let sd = q.sort$[sf] < 0 ? -1 : 1
      list = list.sort(function (a: any, b: any) {
        return sd * (a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1)
      })
    }

    // Skip before limiting.
    if (null != q && q.skip$ && q.skip$ > 0) {
      list = list.slice(q.skip$)
    }

    // Limited the possibly sorted and skipped list.
    if (null != q && q.limit$ && q.limit$ >= 0) {
      list = list.slice(0, q.limit$)
    }

    // Prune fields
    if (null != q && q.fields$) {
      for (let i = 0; i < list.length; i++) {
        let entfields = list[i].fields$()
        for (let j = 0; j < entfields.length; j++) {
          if ('id' !== entfields[j] && -1 == q.fields$.indexOf(entfields[j])) {
            delete list[i][entfields[j]]
          }
        }
      }
    }

    // Return the resulting list to the caller.
    done.call(seneca, null, list)
  }


  static clean_array(ary: string[]): string[] {
    return ary.filter((prop: string) => !prop.includes('$'))
  }
}

