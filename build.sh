./node_modules/.bin/jshint lib/index.js
./node_modules/.bin/docco lib/index.js -o doc
mkdir -p ../gh-pages/seneca-mem-store/doc
cp -r doc/* ../gh-pages/seneca-mem-store/doc
