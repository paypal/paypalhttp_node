'use strict';

let http = require('http');
let https = require('https');
let Buffer = require('buffer').Buffer;
let url = require('url');

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
      throw new Error('serializeRequest not implemented');
    }

    if (typeof this.deserializeResponse !== 'function') {
      throw new Error('deserializeResponse not implemented');
    }
  }

  getUserAgent() {
    return 'BraintreeHttp-Node HTTP/1.1';
  }

  getTimeout() {
    return THIRTY_SECONDS;
  }

  addInjector(injector) {
    if (typeof injector !== 'function' || injector.length !== 1) {
      throw new Error('injector must be a function that takes one argument');
    }

    this._injectors.push(injector);
  }

  execute(request) {
    if (!request.headers) {
      request.headers = {};
    }

    let injectorPromises = this._injectors.map(function (injector) {
      return injector(request);
    });

    let requestBody, requestAborted;
    let client = this.environment.baseUrl.startsWith('https') ? https : http;

    request.host = url.parse(this.environment.baseUrl).hostname;

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

    if (request.verb) {
      request.method = request.verb;
    }

    return new Promise((resolve, reject) => {
      return Promise.all(injectorPromises).then(() => {
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
      }).catch(reject);
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
