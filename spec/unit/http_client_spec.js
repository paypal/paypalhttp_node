'use strict';
/* eslint-disable no-unused-vars, no-invalid-this */

let braintreehttp = require('../../lib/braintreehttp');
let nock = require('nock');
let sinon = require('sinon');
let fs = require('fs');
let zlib = require('zlib');

describe('HttpClient', function () {
  let environment = new braintreehttp.Environment('https://localhost:5000');

  beforeEach(function () {
    this.context = nock(environment.baseUrl);
    this.http = new braintreehttp.HttpClient(environment);
  });

  describe('getUserAgent', function () {
    it('returns the user agent', function () {
      assert.equal(this.http.getUserAgent(), 'BraintreeHttp-Node HTTP/1.1');
    });
  });

  describe('getTimeout', function () {
    it('returns the timeout of 30 seconds', function () {
      assert.equal(this.http.getTimeout(), 30000);
    });
  });

  describe('addInjector', function () {
    it('adds to the injectors array', function () {
      function injector(request) {}

      assert.equal(this.http._injectors.length, 0);

      this.http.addInjector(injector);

      assert.equal(this.http._injectors.length, 1);
    });

    it('throws an error if injector is not a function', function () {
      assert.throws(() => {
        this.http.addInjector({});
      }, /^injector must be a function that takes one argument$/);
    });

    it('throws an error if injector takes no or > 1 arguments', function () {
      assert.throws(() => {
        this.http.addInjector(function () {});
      }, /^injector must be a function that takes one argument$/);

      assert.throws(() => {
        this.http.addInjector(function (one, two) {});
      }, /^injector must be a function that takes one argument$/);
    });
  });

  describe('execute', function () {
    it('initialized with environment and base url', function () {
      assert.equal(this.http.environment.baseUrl, 'https://localhost:5000');
    });

    it('uses injectors to modify a request', function () {
      let headers = {
        'some-key': 'Some Value'
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['some-key'], headers['some-key']);
        });

      function injector(request) {
        request.headers = headers;
      }

      this.http.addInjector(injector);

      let request = {
        verb: 'GET',
        path: '/'
      };

      return this.http.execute(request);
    });

    it('does not mutate original request', function () {
      let headers = {
        'some-key': 'Some Value'
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['some-key'], headers['some-key']);
        });

      function injector(request) {
        request.headers = headers;
      }

      this.http.addInjector(injector);

      let request = {
        verb: 'GET',
        path: '/'
      };

      return this.http.execute(request).then(() => {
        assert.equal(null, request.headers);
      });
    });

    it('sets user agent if not set', function () {
      let request = {
        verb: 'GET',
        path: '/'
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['user-agent'], 'BraintreeHttp-Node HTTP/1.1');
        });

      return this.http.execute(request);
    });

    it('sets user agent if user agent set to Node', function () {
      let request = {
        verb: 'GET',
        path: '/',
        headers: {'User-Agent': 'Node'}
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['user-agent'], 'BraintreeHttp-Node HTTP/1.1');
        });

      return this.http.execute(request);
    });

    it('does not override user agent if set', function () {
      let request = {
        verb: 'GET',
        path: '/',
        headers: {'User-Agent': 'Not Node/1.1'}
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['user-agent'], 'Not Node/1.1');
        });

      return this.http.execute(request);
    });

    it('uses body in request', function () {
      let request = {
        verb: 'POST',
        path: '/',
        body: {
          someKey: 'val',
          someVal: 'val2'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      };

      this.context.post('/').reply(200, function (uri, body) {
        assert.equal(body.someKey, 'val');
        assert.equal(body.someVal, 'val2');
      });

      return this.http.execute(request);
    });

    it('serializes multipart request correctly', function () {
      let request = {
        verb: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        body: {
          file: fs.createReadStream('./README.md'),
          key: 'value'
        }
      };

      this.context.post('/').reply(200, function (uri, body) {
        assert.include(this.req.headers['content-type'], 'multipart/form-data; boundary=boundary');

        let filedata = fs.readFileSync('./README.md');

        assert.include(body, 'Content-Disposition: form-data; name="file"; filename="README.md"\r\nContent-Type: application/octet-stream');
        assert.include(body, filedata);
        assert.include(body, 'Content-Disposition: form-data; name="key"');
        assert.include(body, 'value');
      });

      return this.http.execute(request).then((resp) => {
        assert.equal(resp.statusCode, 200);
      });
    });

    it('parses 200-level response', function () {
      let http = new braintreehttp.HttpClient(environment);
      let request = {
        verb: 'GET',
        path: '/'
      };

      this.context.get('/').reply(200, '{"data":1,"key":"val"}', {
        'Content-Type': 'application/json'
      });

      return http.execute(request)
        .then((resp) => {
          assert.equal(resp.statusCode, 200);
          assert.equal(resp.result.data, 1);
          assert.equal(resp.result.key, 'val');
        });
    });

    describe('gzip', function () {
      it('unzips a 200-level response', function () {
        let http = new braintreehttp.HttpClient(environment);
        let request = {
          verb: 'GET',
          path: '/'
        };

        let body = zlib.gzipSync('{"data":1,"key":"val"}');

        this.context.get('/').reply(200, body, {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip'
        });

        return http.execute(request).then((resp) => {
          assert.equal(1, resp.result.data);
          assert.equal('val', resp.result.key);
        });
      });

      it('unzips a non-200-level response', function () {
        let http = new braintreehttp.HttpClient(environment);
        let request = {
          verb: 'GET',
          path: '/'
        };

        let body = zlib.gzipSync('{"data":1,"key":"val"}');

        this.context.get('/').reply(400, body, {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip'
        });

        return http.execute(request).then((resp) => {
          assert.fail('non 200-level response should have thrown an HttpError');
        })
        .catch((err) => {
          assert.equal(err.message, '{"data":1,"key":"val"}');
        });
      });
    });

    it('rejects promise with error on non 200-level response', function () {
      let request = {
        verb: 'GET',
        path: '/'
      };

      this.context.get('/').reply(400, 'some data about this error', {
        'Content-Type': 'application/json',
        'request-id': '1234'
      });

      return this.http.execute(request)
        .then((resp) => {
          assert.fail('then shouldn\'t be called for 400 status code');
        })
        .catch((error) => {
          assert.equal(error.statusCode, 400);
          assert.equal(error.message, 'some data about this error');
          assert.equal(error.headers['request-id'], '1234');
        });
    });

    it('makes a request when only a path is specified', function () {
      let request = {
        verb: 'GET',
        path: '/some/path'
      };

      this.context.get(request.path)
        .reply(200);

      return this.http.execute(request);
    });

    it('makes a request when full url is specified', function () {
      let request = {
        verb: 'GET',
        path: 'http://some.otherhost.org/some/path'
      };
    });
  });
});
