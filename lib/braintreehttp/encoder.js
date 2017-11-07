'use strict';

let Json = require('./serializer/json').Json;
let Text = require('./serializer/text').Text;
let Multipart = require('./serializer/multipart').Multipart;
let FormEncoded = require('./serializer/form_encoded').FormEncoded;

class Encoder {

  constructor() {
    this._encoders = [new Json(), new Text(), new Multipart(), new FormEncoded()];
  }

  serializeRequest(request) {
    if (request.headers) {
      let contentType = request.headers['content-type'] || request.headers['Content-Type'];

      if (!contentType) {
        throw new Error('HttpRequest does not have Content-Type header set');
      }

      let encoder = this._encoder(contentType);

      if (encoder) {
        return encoder.encode(request);
      }

      throw new Error(`Unable to serialize request with Content-Type ${contentType}. Supported encodings are ${this.supportedEncodings()}`);
    } else {
      throw new Error('HttpRequest does not have Content-Type header set');
    }
  }

  deserializeResponse(responseBody, headers) {
    if (headers) {
      let contentType = headers['content-type'] || headers['Content-Type'];

      if (!contentType) {
        throw new Error('HttpRequest does not have Content-Type header set');
      }

      let encoder = this._encoder(contentType);

      if (encoder) {
        return encoder.decode(responseBody);
      }

      throw new Error(`Unable to deserialize response with Content-Type ${contentType}. Supported decodings are ${this.supportedEncodings()}`);
    } else {
      throw new Error('HttpResponse does not have Content-Type header set');
    }
  }

  supportedEncodings() {
    return '[' + this._encoders.map(e => e.contentType().toString()).join(', ') + ']';
  }

  _encoder(contentType) {
    for (let i = 0; i < this._encoders.length; i++) {
      let enc = this._encoders[i];

      if (enc.contentType().test(contentType)) {
        return enc;
      }
    }

    return null;
  }
}

module.exports = {Encoder: Encoder};
