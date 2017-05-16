'use strict';

let braintreehttp = require('../../lib/braintreehttp');

describe('HttpClient', () =>
  describe('executes', function () {
    it('initialized with environment and base url => ', function () {
      let http = new braintreehttp.HttpClient(new braintreehttp.Environment('https://localhost:3000/api'));

      assert.equal(http.environment.baseUrl, 'https://localhost:3000/api');
    });

    it('uses injectors to modify a request => ', function () {
      let http = new braintreehttp.HttpClient(new braintreehttp.Environment('https://localhost:3000/api'));

      class CustomInjector extends braintreehttp.Injector {
        inject(request) {
          request.headers = {'Some-Key': 'Some Value'};
        }
      }

      http.addInjector(new CustomInjector());

      let request = {
        method: 'GET',
        path: '/'
      };

      http.execute(request);

      assert.equal(request.headers['Some-Key'], 'Some Value');
    });

    it('sets user agent if not set => ', function () {
      let http = new braintreehttp.HttpClient(new braintreehttp.Environment('https://localhost:3000/api'));

      let request = {
        method: 'GET',
        path: '/'
      };

      http.execute(request);

      assert.equal(request.headers['User-Agent'], 'BraintreeHttp-Node HTTP/1.1');
    });

    it('does not override user agent if set => ', function () {
      let http = new braintreehttp.HttpClient(new braintreehttp.Environment('https://localhost:3000/api'));

      let request = {
        method: 'GET',
        path: '/',
        headers: {'User-Agent': 'Not Node/1.1'}
      };

      http.execute(request);

      assert.equal(request.headers['User-Agent'], 'Not Node/1.1');
    });
  })
);
