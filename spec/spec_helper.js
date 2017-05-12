'use strict';
/* eslint-disable func-style, no-console */

// let http = require('http');
// let https = require('https');
// let uri = require('url');
// let chai = require('chai');
// let Buffer = require('buffer').Buffer;
// let xml2js = require('xml2js');
let chai = require('chai');

chai.Assertion.includeStack = true;

global.assert = chai.assert;

global.assert.isEmptyArray = function (array) {
  assert.isArray(array);
  assert.equal(array.length, 0);
};

global.inspect = object => console.dir(object);
