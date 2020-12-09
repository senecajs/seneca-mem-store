/* Copyright (c) 2010-2020 Richard Rodger and other contributors, MIT License */
'use strict';
let internals = {
    name: 'mem-store',
};
module.exports = mem_store;
Object.defineProperty(module.exports, 'name', { value: 'mem-store' });
module.exports.defaults = {
    'entity-id-exists': 'Entity of type <%=type%> with id = <%=id%> already exists.',
};
function mem_store(options) {
    let seneca = this;
    let init = seneca.export('entity/init');
    // merge default options with any provided by the caller
    options = seneca.util.deepextend({
        prefix: '/mem-store',
        web: {
            dump: false,
        },
        // TODO: use seneca.export once it allows for null values
        generate_id: seneca.root.private$.exports['entity/generate_id'],
    }, options);
    // The calling Seneca instance will provide
    // a description for us on init(), it will
    // be used in the logs
    let desc;
    // Our super awesome in mem database. Please bear in mind
    // that this store is meant for fast prototyping, using
    // it for production is not advised!
    let entmap = {};
    // Define the store using a description object.
    // This is a convenience provided by seneca.store.init function.
    let store = {
        // The name of the plugin, this is what is the name you would
        // use in seneca.use(), eg seneca.use('mem-store').
        name: internals.name,
        save: function (msg, reply) {
            // Take a reference to Seneca
            // and the entity to save
            let seneca = this;
            let ent = msg.ent;
            // create our cannon and take a copy of
            // the zone, base and name, we will use
            // this info further down.
            let canon = ent.canon$({ object: true });
            let zone = canon.zone;
            let base = canon.base;
            let name = canon.name;
            // check if we are in create mode,
            // if we are do a create, otherwise
            // we will do a save instead
            let create = ent.id == null;
            if (create) {
                create_new();
            }
            else {
                do_save();
            }
            // The actual save logic for saving or
            // creating and then saving the entity.
            function do_save(id, isnew) {
                let mement = ent.data$(true, 'string');
                if (undefined !== id) {
                    mement.id = id;
                }
                mement.entity$ = ent.entity$;
                entmap[base] = entmap[base] || {};
                entmap[base][name] = entmap[base][name] || {};
                let prev = entmap[base][name][mement.id];
                if (isnew && prev) {
                    return reply(seneca.error('entity-id-exists', { type: ent.entity$, id: id }));
                }
                let shouldMerge = true;
                if (options.merge !== false && ent.merge$ === false) {
                    shouldMerge = false;
                }
                if (options.merge === false && ent.merge$ !== true) {
                    shouldMerge = false;
                }
                mement = seneca.util.deep(mement);
                if (shouldMerge) {
                    mement = Object.assign(prev || {}, mement);
                }
                prev = entmap[base][name][mement.id] = mement;
                seneca.log.debug(function () {
                    return [
                        'save/' + (create ? 'insert' : 'update'),
                        ent.canon$({ string: 1 }),
                        mement,
                        desc,
                    ];
                });
                reply(null, ent.make$(prev));
            }
            // We will still use do_save to save the entity but
            // we need a place to handle new entites and id concerns.
            function create_new() {
                let id;
                // Check if we already have an id or if
                // we need to generate a new one.
                if (undefined !== ent.id$) {
                    // Take a copy of the existing id and
                    // delete it from the ent object. Do
                    // save will handle the id for us.
                    id = ent.id$;
                    delete ent.id$;
                    // Save with the existing id
                    return do_save(id, true);
                }
                // Generate a new id
                id = options.generate_id ? options.generate_id(ent) : void 0;
                if (undefined !== id) {
                    return do_save(id, true);
                }
                else {
                    let gen_id = {
                        role: 'basic',
                        cmd: 'generate_id',
                        name: name,
                        base: base,
                        zone: zone,
                    };
                    // When we get a respones we will use the id param
                    // as our entity id, if this fails we just fail and
                    // call reply() as we have no way to save without an id
                    seneca.act(gen_id, function (err, id) {
                        if (err)
                            return reply(err);
                        do_save(id, true);
                    });
                }
            }
        },
        load: function (msg, reply) {
            let qent = msg.qent;
            let q = msg.q;
            listents(this, entmap, qent, q, function (err, list) {
                let ent = list[0] || null;
                this.log.debug(function () {
                    return ['load', q, qent.canon$({ string: 1 }), ent, desc];
                });
                reply(err, ent);
            });
        },
        list: function (msg, reply) {
            let qent = msg.qent;
            let q = msg.q;
            listents(this, entmap, qent, q, function (err, list) {
                this.log.debug(function () {
                    return [
                        'list',
                        q,
                        qent.canon$({ string: 1 }),
                        list.length,
                        list[0],
                        desc,
                    ];
                });
                reply(err, list);
            });
        },
        remove: function (msg, reply) {
            let seneca = this;
            let qent = msg.qent;
            let q = msg.q;
            let all = q.all$;
            // default false
            let load = q.load$ === true;
            listents(seneca, entmap, qent, q, function (err, list) {
                if (err) {
                    return reply(err);
                }
                list = list || [];
                list = all ? list : list.slice(0, 1);
                list.forEach(function (ent) {
                    let canon = qent.canon$({
                        object: true,
                    });
                    delete entmap[canon.base][canon.name][ent.id];
                    seneca.log.debug(function () {
                        return [
                            'remove/' + (all ? 'all' : 'one'),
                            q,
                            qent.canon$({ string: 1 }),
                            ent,
                            desc,
                        ];
                    });
                });
                let ent = (!all && load && list[0]) || null;
                reply(null, ent);
            });
        },
        close: function (msg, reply) {
            this.log.debug('close', desc);
            reply();
        },
        // .native() is used to handle calls to the underlying driver. Since
        // there is no underlying driver for mem-store we simply return the
        // default entityMap object.
        native: function (msg, reply) {
            reply(null, entmap);
        },
    };
    // Init the store using the seneca instance, merged
    // options and the store description object above.
    let meta = init(seneca, options, store);
    //let meta = seneca.store.init(seneca, options, store)
    // int() returns some metadata for us, one of these is the
    // description, we'll take a copy of that here.
    desc = meta.desc;
    options.idlen = options.idlen || 6;
    seneca.add({ role: store.name, cmd: 'dump' }, function (msg, reply) {
        reply(null, entmap);
    });
    seneca.add({ role: store.name, cmd: 'export' }, function (msg, reply) {
        let entjson = JSON.stringify(entmap);
        reply(null, { json: entjson });
    });
    // TODO: support direct import of literal objects
    seneca.add({ role: store.name, cmd: 'import' }, function (msg, reply) {
        let imported = JSON.parse(msg.json);
        entmap = msg.merge ? this.util.deepextend(entmap, imported) : imported;
        reply();
    });
    // Seneca will call init:plugin-name for us. This makes
    // this action a great place to do any setup.
    //seneca.add('init:mem-store', function (msg, reply) {
    seneca.init(function (reply) {
        if (options.web.dump) {
            this.act('role:web', {
                use: {
                    prefix: options.prefix,
                    pin: { role: 'mem-store', cmd: '*' },
                    map: { dump: true },
                },
                default$: {},
            });
        }
        return reply();
    });
    // We don't return the store itself, it will self load into Seneca via the
    // init() function. Instead we return a simple object with the stores name
    // and generated meta tag.
    return {
        name: store.name,
        tag: meta.tag,
        exportmap: {
            native: entmap,
        },
    };
}
module.exports.preload = function () {
    let seneca = this;
    let meta = {
        name: internals.name,
        exportmap: {
            native: function () {
                seneca.export(internals.name + '/native').apply(this, arguments);
            },
        },
    };
    return meta;
};
// Seneca supports a reasonable set of features
// in terms of listing. This function can handle
// sorting, skiping, limiting and general retrieval.
function listents(seneca, entmap, qent, q, done) {
    let list = [];
    let canon = qent.canon$({ object: true });
    let base = canon.base;
    let name = canon.name;
    let entset = entmap[base] ? entmap[base][name] : null;
    let ent;
    if (null != entset && null != q) {
        if ('string' == typeof q) {
            ent = entset[q];
            if (ent) {
                list.push(ent);
            }
        }
        else if (Array.isArray(q)) {
            q.forEach(function (id) {
                let ent = entset[id];
                if (ent) {
                    ent = qent.make$(ent);
                    list.push(ent);
                }
            });
        }
        else if ('object' === typeof q) {
            let entids = Object.keys(entset);
            next_ent: for (let id of entids) {
                ent = entset[id];
                for (let p in q) {
                    let qv = q[p]; // query val
                    let ev = ent[p]; // ent val
                    if (-1 === p.indexOf('$')) {
                        if (Array.isArray(qv)) {
                            if (-1 === qv.indexOf(ev)) {
                                continue next_ent;
                            }
                        }
                        else if (null != qv && 'object' === typeof qv) {
                            // mongo style constraints
                            if ((null != qv.$ne && qv.$ne == ev) ||
                                (null != qv.$gte && qv.$gte > ev) ||
                                (null != qv.$gt && qv.$gt >= ev) ||
                                (null != qv.$lt && qv.$lt <= ev) ||
                                (null != qv.$lte && qv.$lte < ev) ||
                                (null != qv.$in && -1 === qv.$in.indexOf(ev)) ||
                                (null != qv.$nin && -1 !== qv.$nin.indexOf(ev)) ||
                                false) {
                                continue next_ent;
                            }
                        }
                        else if (qv !== ev) {
                            continue next_ent;
                        }
                    }
                }
                ent = qent.make$(ent);
                list.push(ent);
            }
        }
    }
    // Always sort first, this is the 'expected' behaviour.
    if (q.sort$) {
        let sf;
        for (sf in q.sort$) {
            break;
        }
        let sd = q.sort$[sf] < 0 ? -1 : 1;
        list = list.sort(function (a, b) {
            return sd * (a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1);
        });
    }
    // Skip before limiting.
    if (q.skip$ && q.skip$ > 0) {
        list = list.slice(q.skip$);
    }
    // Limited the possibly sorted and skipped list.
    if (q.limit$ && q.limit$ >= 0) {
        list = list.slice(0, q.limit$);
    }
    // Prune fields
    if (q.fields$) {
        for (let i = 0; i < list.length; i++) {
            let entfields = list[i].fields$();
            for (let j = 0; j < entfields.length; j++) {
                if ('id' !== entfields[j] && -1 == q.fields$.indexOf(entfields[j])) {
                    delete list[i][entfields[j]];
                }
            }
        }
    }
    // Return the resulting list to the caller.
    done.call(seneca, null, list);
}
//# sourceMappingURL=mem-store.js.map