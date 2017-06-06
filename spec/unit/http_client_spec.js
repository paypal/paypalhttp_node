'use strict';
/* eslint-disable no-unused-vars, no-invalid-this */

let braintreehttp = require('../../lib/braintreehttp');
let nock = require('nock');
let sinon = require('sinon');

class BTJsonHttpClient extends braintreehttp.HttpClient {
  serializeRequest() {
    return 'request';
  }
  deserializeResponse() {
    return 'response';
  }
  parseResponseBody(data, headers) {
    return JSON.parse(data);
  }
}

describe('HttpClient', function () {
  let environment = new braintreehttp.Environment('https://localhost');

  beforeEach(function () {
    class CustomHttpClient extends braintreehttp.HttpClient {
      serializeRequest(request) {
        return JSON.stringify(request.body);
      }
      deserializeResponse() {
        return 'response';
      }
    }

    this.context = nock(environment.baseUrl);
    this.http = new CustomHttpClient(environment);
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
      class CustomInjector extends braintreehttp.Injector {
        inject() {}
      }

      let injector = new CustomInjector();

      assert.equal(this.http._injectors.length, 0);

      this.http.addInjector(injector);

      assert.equal(this.http._injectors.length, 1);
    });

    it('throws an error if injector is not of class Injector', function () {
      assert.throws(() => {
        this.http.addInjector({});
      }, /^injector must be an instance of Injector$/);
    });
  });

  describe('serializeRequest', function () {
    it('throws an error if subclass does not impliment it', function () {
      class CustomHttpClient extends braintreehttp.HttpClient {
        deserializeResponse() {
          return 'response';
        }
      }

      assert.throws(() => {
        let client = new CustomHttpClient();
      }, /^serializeRequest not implimented$/);
    });

    it('calls the subclass method when implimented', function () {
      class CustomHttpClient extends braintreehttp.HttpClient {
        serializeRequest() {
          return 'ok';
        }
        deserializeResponse() {
          return 'response';
        }
      }

      let client = new CustomHttpClient();

      assert.equal(client.serializeRequest(), 'ok');
    });
  });

  describe('deserializeResponse', function () {
    it('throws an error if subclass does not impliment it', function () {
      class CustomHttpClient extends braintreehttp.HttpClient {
        serializeRequest() {
          return 'request';
        }
      }

      assert.throws(() => {
        let client = new CustomHttpClient();
      }, /^deserializeResponse not implimented$/);
    });

    it('calls the subclass method when implimented', function () {
      class CustomHttpClient extends braintreehttp.HttpClient {
        serializeRequest() {
          return 'request';
        }
        deserializeResponse() {
          return 'ok';
        }
      }

      let client = new CustomHttpClient();

      assert.equal(client.deserializeResponse(), 'ok');
    });
  });

  describe('execute', function () {
    it('initialized with environment and base url', function () {
      assert.equal(this.http.environment.baseUrl, 'https://localhost');
    });

    it('uses injectors to modify a request', function () {
      let headers = {
        'some-key': 'Some Value'
      };

      this.context.get('/')
        .reply(200, function (uri, body) {
          assert.equal(this.req.headers['some-key'], headers['some-key']);
        });

      class CustomInjector extends braintreehttp.Injector {
        inject(request) {
          request.headers = headers;
        }
      }

      this.http.addInjector(new CustomInjector());

      let request = {
        method: 'GET',
        path: '/'
      };

      return this.http.execute(request);
    });

    it('sets user agent if not set', function () {
      let request = {
        method: 'GET',
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
        method: 'GET',
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
        method: 'GET',
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
        method: 'POST',
        path: '/',
        body: {
          someKey: 'val',
          someVal: 'val2'
        }
      };

      this.context.post('/').reply(200, function (uri, body) {
        body = JSON.parse(body);
        assert.equal(body.someKey, 'val');
        assert.equal(body.someVal, 'val2');
      });

      return this.http.execute(request);
    });

    it('uses provided body if it is a string', function () {
      let request = {
        method: 'POST',
        path: '/',
        body: '{"someKey":"val","someVal":"val2"}'
      };

      sinon.spy(this.http, 'serializeRequest');

      this.context.post('/').reply(200, function (uri, body) {
        body = JSON.parse(body);
        assert.equal(body.someKey, 'val');
        assert.equal(body.someVal, 'val2');
      });

      return this.http.execute(request).then(() => {
        assert.equal(this.http.serializeRequest.called, false);
      });
    });

    it('users serialize function if body is not a string', function () {
      let request = {
        method: 'POST',
        path: '/',
        body: {
          someKey: 'val',
          someVal: 'val2'
        }
      };

      sinon.spy(this.http, 'serializeRequest');

      this.context.post('/').reply(200);

      return this.http.execute(request).then(() => {
        assert.equal(this.http.serializeRequest.called, true);
        assert.equal(this.http.serializeRequest.calledWith(request), true);
      });
    });

    it('parses 200-level response', function () {
      let http = new BTJsonHttpClient(environment);
      let request = {
        method: 'GET',
        path: '/'
      };

      this.context.get('/')
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

      this.context.get('/')
        .reply(400, 'some data about this error', {
          'request-id': '1234'
        });

      return this.http.execute(request)
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

      this.context.get(request.path)
        .reply(200);

      return this.http.execute(request);
    });

    it('makes a request when full url is specified', function () {
      let request = {
        method: 'GET',
        path: 'http://some.otherhost.org/some/path'
      };
    });
  });
});
