'use strict';

class Json {
  encode(request) {
    return JSON.stringify(request.body);
  }

  decode(body) {
    return JSON.parse(body);
  }

  contentType() {
    return /^application\/json/i;
  }
}

module.exports.Json = Json;
