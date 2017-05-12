'use strict';

class Errors {
  constructor(statusCode, result, headers) {
    this.statusCode = statusCode;
    this.result = result;
    this.headers = headers;
  }
}

module.exports = {Errors: Errors};
