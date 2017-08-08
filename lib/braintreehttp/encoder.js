'use strict';

class Encoder {

  constructor() {}

  serializeRequest(request) {
    if (request.headers) {
      let contentType = request.headers['content-type'] || request.headers['Content-Type'];

      if (contentType === 'application/json') {
        return JSON.stringify(request.body);
      }
      throw new Error(`Unable to serialize request with Content-Type ${contentType}. Supported encodings are ${this.supportedEncodings()}`);
    } else {
      throw new Error('HttpRequest does not have Content-Type header set');
    }
  }

  deserializeResponse(responseBody, headers) {
    if (headers) {
      let contentType = headers['content-type'] || headers['Content-Type'];

      if (contentType === 'application/json') {
        return JSON.parse(responseBody);
      }
      throw new Error(`Unable to deserialize response with Content-Type ${contentType}. Supported decodings are ${this.supportedDecodings()}`);
    } else {
      throw new Error('HttpResponse does not have Content-Type header set');
    }
  }

  supportedEncodings() {
    return ['application/json'];
  }

  supportedDecodings() {
    return ['application/json'];
  }
}

module.exports = {Encoder: Encoder};
