'use strict';

let braintreehttp = require('../../lib/braintreehttp');

describe('encoder', function () {
  let encoder = new braintreehttp.Encoder();

  describe('serializeRequest', function () {
    it('serializes a request with content-type == application/json', function () {
      let req = {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          one: 'two',
          three: ['one', 'two', 'three']
        }
      };

      assert.equal(encoder.serializeRequest(req), '{"one":"two","three":["one","two","three"]}');
    });

    it('throws when content-type not application/json', function () {
      let req = {
        headers: {
          'Content-Type': 'not application/json'
        },
        body: {
          one: 'two',
          three: ['one', 'two', 'three']
        }
      };

      assert.throws(() => encoder.serializeRequest(req), Error, 'Unable to serialize request with Content-Type not application/json. Supported encodings are application/json');
    });

    it('throws when headers undefined', function () {
      let req = {
        body: {
          one: 'two',
          three: ['one', 'two', 'three']
        }
      };

      assert.throws(() => encoder.serializeRequest(req), Error, 'HttpRequest does not have Content-Type header set');
    });
  });

  describe('deserializeResponse', function () {
    it('deserializes a response with content-type == application/json', function () {
      let headers = {
        'content-type': 'application/json'
      };
      let body = '{"one":"two","three":["one","two","three"]}';
      let deserialized = encoder.deserializeResponse(body, headers);

      assert.equal(deserialized.one, 'two');
      assert.deepEqual(deserialized.three, ['one', 'two', 'three']);
    });

    it('throws when content-type not application/json', function () {
      let headers = {
        'content-type': 'not application/json'
      };
      let body = '{"one":"two","three":["one","two","three"]}';

      assert.throws(() => encoder.deserializeResponse(body, headers), Error, 'Unable to deserialize response with Content-Type not application/json. Supported decodings are application/json');
    });

    it('throws when headers undefined', function () {
      let body = '{"one":"two","three":["one","two","three"]}';

      assert.throws(() => encoder.deserializeResponse(body), Error, 'HttpResponse does not have Content-Type header set');
    });
  });
});
