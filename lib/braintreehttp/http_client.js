'use strict';

let http = require('http');
let https = require('https');
let Buffer = require('buffer').Buffer;
let url = require('url');

class HttpClient {
  constructor(environment) {
    this.environment = environment;
    this.injectors = [];
  }

  userAgent() {
    return 'BraintreeHttp-Node HTTP/1.1';
  }

  addInjector(inj) {
    this.injectors.push(inj);
  }

  execute(request) {
    this.injectors.forEach(function (injector) {
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
      request.headers['User-Agent'] = this.userAgent();
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
          // TooDoo Check status code and generate an error if appropriate
          let error = null;

          if (error) {
            reject(error);
            return;
          }
          if (body !== ' ') {
            resolve(this.parseResponseBody(body, response.headers));
          } else {
            resolve();
          }
        });

        response.on('error', function (err) {
          let error = err;

          reject(error);
        });
      });

      function timeoutHandler() {
        theRequest.abort();
        requestAborted = true;
        let error = {};

        reject(error);
      }

      theRequest.setTimeout(60000, timeoutHandler);

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
