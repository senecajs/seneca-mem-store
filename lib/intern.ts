export function is_new(ent: any): boolean {
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


export function is_upsert_requested(msg: any): boolean {
  const { ent, q } = msg
  return is_new(ent) && Array.isArray(q.upsert$)
}


export function find_one_doc(entmap: any, ent: any, filter: any): any {
  const { base, name } = ent.canon$({ object: true })

  if (!(base in entmap)) {
    return null
  }

  if (!(name in entmap[base])) {
    return null
  }

  const entset = entmap[base][name]
  const docs = Object.values(entset)

  const doc = docs.find((doc: any) => {
    for (const fp in filter) {
      if (fp in doc && filter[fp] === doc[fp]) {
        continue
      }

      return false
    }
    
    return true
  })

  if (!doc) {
    return null
  }

  return doc
}


export function update_one_doc(entmap: any, ent: any, filter: any, new_attrs: any) {
  const doc_to_update = find_one_doc(entmap, ent, filter)

  if (doc_to_update) {
    Object.assign(doc_to_update, new_attrs)
    return doc_to_update
  }

  return null
}


export function should_merge(ent: any, plugin_opts: any): boolean {
  if (plugin_opts.merge !== false && ent.merge$ === false) {
    return false
  }

  if (plugin_opts.merge === false && ent.merge$ !== true) {
    return false
  }

  return true
}


// NOTE: Seneca supports a reasonable set of features
// in terms of listing. This function can handle
// sorting, skiping, limiting and general retrieval.
//
export function listents(seneca: any, entmap: any, qent: any, q: any, done: any) {
  let list = []

  let canon = qent.canon$({ object: true })
  let base = canon.base
  let name = canon.name

  let entset = entmap[base] ? entmap[base][name] : null
  let ent

  if (null != entset && null != q) {
    if ('string' == typeof q) {
      ent = entset[q]
      if (ent) {
        list.push(ent)
      }
    } else if (Array.isArray(q)) {
      q.forEach(function(id) {
        let ent = entset[id]
        if (ent) {
          ent = qent.make$(ent)
          list.push(ent)
        }
      })
    } else if ('object' === typeof q) {
      let entids = Object.keys(entset)
      next_ent: for (let id of entids) {
        ent = entset[id]
        for (let p in q) {
          let qv = q[p] // query val
          let ev = ent[p] // ent val

          if (-1 === p.indexOf('$')) {
            if (Array.isArray(qv)) {
              if (-1 === qv.indexOf(ev)) {
                continue next_ent
              }
            } else if (null != qv && 'object' === typeof qv) {
              // mongo style constraints
              if (
                (null != qv.$ne && qv.$ne == ev) ||
                (null != qv.$gte && qv.$gte > ev) ||
                (null != qv.$gt && qv.$gt >= ev) ||
                (null != qv.$lt && qv.$lt <= ev) ||
                (null != qv.$lte && qv.$lte < ev) ||
                (null != qv.$in && -1 === qv.$in.indexOf(ev)) ||
                (null != qv.$nin && -1 !== qv.$nin.indexOf(ev)) ||
                false
              ) {
                continue next_ent
              }
            } else if (qv !== ev) {
              continue next_ent
            }
          }
        }
        ent = qent.make$(ent)
        list.push(ent)
      }
    }
  }

  // Always sort first, this is the 'expected' behaviour.
  if (q.sort$) {
    let sf: any
    for (sf in q.sort$) {
      break
    }

    let sd = q.sort$[sf] < 0 ? -1 : 1
    list = list.sort(function(a, b) {
      return sd * (a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1)
    })
  }

  // Skip before limiting.
  if (q.skip$ && q.skip$ > 0) {
    list = list.slice(q.skip$)
  }

  // Limited the possibly sorted and skipped list.
  if (q.limit$ && q.limit$ >= 0) {
    list = list.slice(0, q.limit$)
  }

  // Prune fields
  if (q.fields$) {
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

