![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin.

# @seneca/mem-store

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|


## Install

```sh
npm install seneca
npm install seneca-mem-store
```

You'll need the [seneca](http://github.com/senecajs/seneca) toolkit to use this module - it's just a plugin.

## Quick Example

```js
var seneca = require('seneca')()

seneca.use('basic')
.use('entity')

// Since mem-store is a default plugin, it does not need to be
// added with .use(). You can just go ahead and use it.
seneca.ready(function () {
  var apple = seneca.make$('fruit')
  apple.name = 'Pink Lady'
  apple.price = 0.99

  apple.save$(function (err, apple) {
    console.log("apple.id = " + apple.id)
  })
})
```

## More Examples

See [test/](test/) for usage examples.

## Motivation

This module is a plugin for the Seneca framework. It provides an in-memory storage engine. *Data does not persist between runs.* Most useful for early development and unit testing.

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]
- Ask on the [Gitter][gitter-url]

## API

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```js
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$(function (err, entity) { ... })
entity.load$({id: ... }, function (err, entity) { ... })
entity.list$({property: ... }, function (err, entity) { ... })
entity.remove$({id: ... }, function (err, entity) { ... })
```


### Query Support

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.
- `.list$({f1:v1,...}, {sort$:{field1:1}})` means sort by f1, ascending.
- `.list$({f1:v1,...}, {sort$:{field1:-1}})` means sort by f1, descending.
- `.list$({f1:v1,...}, {limit$:10})` means only return 10 results.
- `.list$({f1:v1,...}, {skip$:5})` means skip the first 5.
- `.list$({f1:v1,...}, {fields$:['fd1','f2']})` means only return the listed fields.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.


### Running tests

```sh
npm run test
```

## Background

This plugin is loaded by default by the [seneca-entity][seneca-entity-url] plugin.

[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-mem-store/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-mem-store/actions/workflows/build.yml)
[![Dependency Status][david-badge]][david-url]
[![Maintainability](https://api.codeclimate.com/v1/badges/e2cdcc5415161cb378b0/maintainability)](https://codeclimate.com/github/senecajs/seneca-mem-store/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/17225/branches/388415/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=17225&bid=388415)
[![Coveralls][BadgeCoveralls]][Coveralls]
[MIT]: ./LICENSE
[npm-badge]: https://badge.fury.io/js/seneca-mem-store.svg
[npm-url]: https://badge.fury.io/js/seneca-mem-store
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[@senecajs]: http://twitter.com/senecajs
[senecajs.org]: http://senecajs.org/
[travis-badge]: https://travis-ci.org/senecajs/seneca-mem-store.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-mem-store
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[github issue]: https://github.com/senecajs/seneca-mem-store/issues
[ActiveRecord-style data storage API]:http://senecajs.org/tutorials/understanding-data-entities.html
[david-badge]: https://david-dm.org/senecajs/seneca-mem-store.svg
[david-url]: https://david-dm.org/senecajs/seneca-mem-store
[Coveralls]: https://coveralls.io/github/senecajs/seneca-mem-store?branch=master
[BadgeCoveralls]: https://coveralls.io/repos/github/senecajs/seneca-mem-store/badge.svg?branch=master
[seneca-basic-url]: https://github.com/senecajs/seneca-basic
[seneca-entity-url]: https://github.com/senecajs/seneca-entity
[mem-store-tests]: https://github.com/senecajs/seneca-mem-store/tree/master/test
