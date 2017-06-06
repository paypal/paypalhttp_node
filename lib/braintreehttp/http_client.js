'use strict';

let http = require('http');
let https = require('https');
let Buffer = require('buffer').Buffer;
let url = require('url');
let Injector = require('./injector').Injector;

const THIRTY_SECONDS = 10 * 3000;

class HttpClient {
  constructor(environment) {
    this.environment = environment;
    this._injectors = [];
  }

  getUserAgent() {
    return 'BraintreeHttp-Node HTTP/1.1';
  }

  getTimeout() {
    return THIRTY_SECONDS;
  }

  addInjector(injector) {
    if (!(injector instanceof Injector)) {
      throw new Error('injector must be an instance of Injector');
    }

    this._injectors.push(injector);
  }

  execute(request) {
    this._injectors.forEach(function (injector) {
      injector.inject(request);
    });

    let requestBody, requestAborted;
    let body = request.body;
    let client = this.environment.baseUrl.startsWith('https') ? https : http;

    request.host = url.parse(this.environment.baseUrl).hostname;

    if (!request.headers) {
      request.headers = {};
    }

    if (!request.headers['User-Agent'] || request.headers['User-Agent'] === 'Node') {
      request.headers['User-Agent'] = this.getUserAgent();
    }

    if (body) {
      requestBody = JSON.stringify(body);
      request.headers['Content-Length'] = Buffer.byteLength(requestBody).toString();
    }

    return new Promise((resolve, reject) => {
      let theRequest = client.request(request, (response) => {
        body = '';

        response.on('data', (responseBody) => {
          body += responseBody;
        });

        response.on('end', () => {
          let resp = {
            statusCode: response.statusCode,
            headers: response.headers,
            result: this.parseResponseBody(body, response.headers)
          };

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(resp);
          } else {
            reject(resp);
          }
        });

        response.on('error', (err) => {
          reject(err);
        });
      });

      function timeoutHandler() {
        theRequest.abort();
        requestAborted = true;
        let error = {};

        reject(error);
      }

      theRequest.setTimeout(this.getTimeout(), timeoutHandler);

      let requestSocket = null;

      theRequest.on('socket', (socket) => {
        requestSocket = socket;
      });

      theRequest.on('error', err => {
        if (requestAborted) { return; }
        requestSocket.removeListener('timeout', timeoutHandler);
        let error = err;

        reject(error);
      });

      if (body) { theRequest.write(requestBody); }
      theRequest.end();
    });
  }

  /* eslint-disable */
  parseResponseBody(body, headers) {
    return body;
  }
  /* eslint-enable */
}

module.exports = {HttpClient: HttpClient};
