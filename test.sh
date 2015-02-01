# Only install seneca to run tests.
# There is no explicit dependency either in production or development
# because this plugin is itself a dependency of the seneca module.

if [ ! -d "./node_modules/seneca" ]; then
  npm install seneca@plugin
fi
./node_modules/.bin/mocha test/*.test.js
