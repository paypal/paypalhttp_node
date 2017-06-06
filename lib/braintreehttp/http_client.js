'use strict';

let http = require('http');
let https = require('https');
let Buffer = require('buffer').Buffer;
let url = require('url');
let Injector = require('./injector').Injector;

const THIRTY_SECONDS = 10 * 3000;

class HttpError extends Error {
  constructor(response) {
    super();

    this.message = response.message || response.text || 'An unknown error occured.';
    this.statusCode = response.statusCode;
    this.headers = response.headers;
    this._originalError = response;
  }
}

class HttpClient {
  constructor(environment) {
    this.environment = environment;
    this._injectors = [];

    if (typeof this.serializeRequest !== 'function') {
      throw new Error('serializeRequest not implimented');
    }

    if (typeof this.deserializeResponse !== 'function') {
      throw new Error('deserializeResponse not implimented');
    }
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
    let client = this.environment.baseUrl.startsWith('https') ? https : http;

    request.host = url.parse(this.environment.baseUrl).hostname;

    if (!request.headers) {
      request.headers = {};
    }

    if (!request.headers['User-Agent'] || request.headers['User-Agent'] === 'Node') {
      request.headers['User-Agent'] = this.getUserAgent();
    }

    if (request.body) {
      if (typeof request.body === 'string') {
        requestBody = request.body;
      } else {
        requestBody = this.serializeRequest(request);
      }
      request.headers['Content-Length'] = Buffer.byteLength(requestBody).toString();
    }

    return new Promise((resolve, reject) => {
      let theRequest = client.request(request, (response) => {
        let body = '';

        response.on('data', (responseBody) => {
          body += responseBody;
        });

        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode <= 299) {
            resolve(this._parseResponse(body, response));
          } else {
            reject(new HttpError({
              text: body,
              statusCode: response.statusCode,
              headers: response.headers
            }));
          }
        });

        response.on('error', reject);
      });

      function timeoutHandler() {
        theRequest.abort();
        requestAborted = true;

        reject(new Error('Request timed out'));
      }

      theRequest.setTimeout(this.getTimeout(), timeoutHandler);

      let requestSocket = null;

      theRequest.on('socket', (socket) => {
        requestSocket = socket;
      });

      theRequest.on('error', (error) => {
        if (requestAborted) { return; }
        requestSocket.removeListener('timeout', timeoutHandler);

        reject(error);
      });

      if (requestBody) {
        theRequest.write(requestBody);
      }
      theRequest.end();
    });
  }

  _parseResponse(body, response) {
    var data = {
      statusCode: response.statusCode,
      headers: response.headers
    };

    if (body) {
      data.result = this.deserializeResponse(body, response.headers);
    }

    return data;
  }
}

module.exports = {HttpClient: HttpClient};
