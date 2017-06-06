'use strict';
/* eslint-disable no-unused-vars, no-invalid-this */

let braintreehttp = require('../../lib/braintreehttp');
let nock = require('nock');

class BTJsonHttpClient extends braintreehttp.HttpClient {
  parseResponseBody(data, headers) {
    return JSON.parse(data);
  }
}

describe('HttpClient', function () {
  let environment = new braintreehttp.Environment('https://localhost');
  let context = null;
  let http = null;

  beforeEach(function () {
    context = nock(environment.baseUrl);
    http = new braintreehttp.HttpClient(environment);
  });

  describe('getUserAgent', function () {
    it('returns the user agent', function () {
      assert.equal(http.getUserAgent(), 'BraintreeHttp-Node HTTP/1.1');
    });
  });

  describe('getTimeout', function () {
    it('returns the timeout of 30 seconds', function () {
      assert.equal(http.getTimeout(), 30000);
    });
  });

  describe('addInjector', function () {
    it('adds to the injectors array', function () {
      class CustomInjector extends braintreehttp.Injector {
        inject() {}
      }

      let injector = new CustomInjector();

      assert.equal(http._injectors.length, 0);

      http.addInjector(injector);

      assert.equal(http._injectors.length, 1);
    });

    it('throws an error if injector is not of class Injector', function () {
      assert.throws(() => {
        http.addInjector({});
      }, /^injector must be an instance of Injector$/);
    });
  });

  describe('execute', function () {
    it('initialized with environment and base url', function () {
      assert.equal(http.environment.baseUrl, 'https://localhost');
    });

    it('uses injectors to modify a request', function () {
      let headers = {
        'some-key': 'Some Value'
      };

      context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['some-key'], headers['some-key']);
        });

      class CustomInjector extends braintreehttp.Injector {
        inject(request) {
          request.headers = headers;
        }
      }

      http.addInjector(new CustomInjector());

      let request = {
        method: 'GET',
        path: '/'
      };

      return http.execute(request);
    });

    it('sets user agent if not set', function () {
      let request = {
        method: 'GET',
        path: '/'
      };

      context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['user-agent'], 'BraintreeHttp-Node HTTP/1.1');
        });

      return http.execute(request);
    });

    it('does not override user agent if set', function () {
      let request = {
        method: 'GET',
        path: '/',
        headers: {'User-Agent': 'Not Node/1.1'}
      };

      context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['user-agent'], 'Not Node/1.1');
        });

      return http.execute(request);
    });

    it('uses body in request', function () {
      let request = {
        method: 'POST',
        path: '/',
        body: {
          someKey: 'val',
          someVal: 'val2'
        }
      };

      context.post('/')
      .reply(200, function (uri, body) {
        body = JSON.parse(body);
        assert.equal(body.someKey, 'val');
        assert.equal(body.someVal, 'val2');
      });

      return http.execute(request);
    });

    it('parses 200-level response', function () {
      http = new BTJsonHttpClient(environment);
      let request = {
        method: 'GET',
        path: '/'
      };

      context.get('/')
      .reply(200, function (uri, body) {
        return JSON.stringify({
          data: 1,
          key: 'val'
        });
      });

      return http.execute(request)
        .then((resp) => {
          assert.equal(resp.statusCode, 200);
          assert.equal(resp.result.data, 1);
          assert.equal(resp.result.key, 'val');
        });
    });

    it('rejects promise with error on non 200-level response', function () {
      let request = {
        method: 'GET',
        path: '/'
      };

      context.get('/')
        .reply(400, 'some data about this error', {
          'request-id': '1234'
        });

      return http.execute(request)
        .then((resp) => {
          assert.fail('then shouldn\'t be called for 400 status code');
        })
        .catch((error) => {
          assert.equal(error.statusCode, 400);
          assert.equal(error.result, 'some data about this error');
          assert.equal(error.headers['request-id'], '1234');
        });
    });

    it('makes a request when only a path is specified', function () {
      let request = {
        method: 'GET',
        path: '/some/path'
      };

      context.get(request.path)
        .reply(200);

      return http.execute(request);
    });

    it('makes a request when full url is specified', function () {
      let request = {
        method: 'GET',
        path: 'http://some.otherhost.org/some/path'
      };
    });
  });
});
