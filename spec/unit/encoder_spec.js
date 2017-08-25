'use strict';

let braintreehttp = require('../../lib/braintreehttp');
let fs = require('fs');

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

    it('serializes a request with content-type == text/*', function () {
      let req = {
        headers: {
          'Content-Type': 'text/asdf'
        },
        body: 'some asdf text'
      };

      assert.equal(encoder.serializeRequest(req), 'some asdf text');
    });

    it('serializes a request with content-type multipart/*', function () {
      let fp = './spec/unit/resources/fileupload_test_binary.jpg';

      let request = {
        verb: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        body: {
          file: fs.createReadStream(fp),
          key: 'value'
        }
      };

      let encoded = encoder.serializeRequest(request);

      assert.include(request.headers['content-type'], 'multipart/form-data; boundary=boundary');

      let filedata = fs.readFileSync(fp);

      assert.include(encoded, 'Content-Disposition: form-data; name="file"; filename="fileupload_test_binary.jpg"\r\nContent-Type: image/jpeg');
      assert.include(encoded, filedata);
      assert.include(encoded, 'Content-Disposition: form-data; name="key"');
      assert.include(encoded, 'value');
    });

    it('throws when content-type not supported', function () {
      let req = {
        headers: {
          'Content-Type': 'not application/json'
        },
        body: {
          one: 'two',
          three: ['one', 'two', 'three']
        }
      };

      assert.throws(() => encoder.serializeRequest(req), Error, 'Unable to serialize request with Content-Type not application/json. Supported encodings are [/^application\\/json$/, /^text\\/.*/, /^multipart\\/.*/]');
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

    it('deserializes a response with content-type == text/*', function () {
      let headers = {
        'content-type': 'text/asdf'
      };
      let body = 'some asdf text';

      assert.equal(encoder.deserializeResponse(body, headers), body);
    });

    it('throws when response content-type multipart/*', function () {
      let headers = {
        'content-type': 'multipart/form-data'
      };

      let body = 'some form data';

      assert.throws(() => encoder.deserializeResponse(body, headers), Error, 'Multipart does not support deserialization.');
    });

    it('throws when content-type not supported', function () {
      let headers = {
        'content-type': 'not application/json'
      };
      let body = '{"one":"two","three":["one","two","three"]}';

      assert.throws(() => encoder.deserializeResponse(body, headers), Error, 'Unable to deserialize response with Content-Type not application/json. Supported decodings are [/^application\\/json$/, /^text\\/.*/, /^multipart\\/.*/]');
    });

    it('throws when headers undefined', function () {
      let body = '{"one":"two","three":["one","two","three"]}';

      assert.throws(() => encoder.deserializeResponse(body), Error, 'HttpResponse does not have Content-Type header set');
    });
  });
});
