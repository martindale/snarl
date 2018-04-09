'use strict';
// # ER MAH GERWD
// ## `erm`, an example Doorman plugin
// Using [the Doorman plugin system](), it's easy to respond to messages with
// a simple API.  First, let's import erm (https://www.npmjs.com/package/erm):
const erm = require('erm');

// Using the new Object destructuring feature in ES6, we can simply export the
// function made available by the `erm` module:
module.exports = { erm };
