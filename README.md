![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin.

# seneca-mem-store
[![Build Status][travis-badge]][travis-url]
[![Gitter][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

This module is a plugin for the Seneca framework. It provides an
in-memory storage engine that provides a set of data storage action
patterns. *Data does not persist betweens runs*.  This plugin is most
useful for early development and unit testing. It also provides an
example of a document-oriented storage plugin code-base.

The Seneca framework provides an [ActiveRecord-style data storage API][].
Each supported database has a plugin, such as this one, that provides 
the underlying Seneca plugin actions required for data persistence.

This plugin is included with the main seneca module.

- __Version:__ 0.3.1
- __Tested on:__ Seneca 0.6.2
- __Node:__ `0.10, 0.11, 0.12, 4`

[Annotated Source](http://rjrodger.github.io/seneca-mem-store/doc/mem-store.html)

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.


## Install
This plugin module is included in the main Seneca module.

```sh
npm install seneca
```

### Explicit install
To explicitly install separately,

```sh
npm install seneca-mem-store
```

And in your code:

```js
var seneca = require('seneca')({
  default_plugins: {
    'mem-store': false
  }
})
seneca.use(require('seneca-mem-store'))
```

## Test
To run tests, simply use npm:

```sh
npm run test
```

## Releases
- 0.3.1: 2015-06-16: export action responds with object: {json: "..."}
- 0.3.0: 2015-06-16: cmd:import/export no longer uses filesystem, just accepts/provides JSON string. Prep for Seneca 0.6.2.

## Contributing
The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## License
Copyright Richard Rodger and other contributors 2015, Licensed under [MIT][].

[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[@senecajs]: http://twitter.com/senecajs
[senecajs.org]: http://senecajs.org/
[travis-badge]: https://travis-ci.org/rjrodger/seneca-mem-store.svg
[travis-url]: https://travis-ci.org/rjrodger/seneca-mem-store
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard
[github issue]: https://github.com/rjrodger/seneca-mem-store/issues
[ActiveRecord-style data storage API]:http://senecajs.org/data-entities.html
