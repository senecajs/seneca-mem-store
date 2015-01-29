./node_modules/.bin/jshint mem-store.js
./node_modules/.bin/docco mem-store.js -o doc
cp -r doc/* ../gh-pages/seneca-mem-store/doc
