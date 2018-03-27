'use strict';

let fs = require('fs');
let path = require('path');

class MultipartRelated {
  static get _CRLF() {
    return '\r\n';
  }

  encode(request) {
    let boundary = 'boundary' + Date.now();

    request.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

    let valueBuffers = [];
    let fileBuffers = [];

    for (const key of Object.keys(request.body)) {
      let val = request.body[key];

      if (val instanceof fs.ReadStream) {
        fileBuffers.push(this._filePart(key, val, boundary, request));
      } else {
        valueBuffers.push(this._formPart(key, val, boundary, request));
      }
    }

    let buffers = valueBuffers.concat(fileBuffers);

    buffers.push(Buffer.from(`--${boundary}--`));
    buffers.push(Buffer.from(MultipartRelated._CRLF));
    buffers.push(Buffer.from(MultipartRelated._CRLF));

    return Buffer.concat(buffers);
  }

  decode() {
    throw new Error('MultipartRelated does not support deserialization.');
  }

  contentType() {
    return /^multipart\/related/;
  }

  _filePart(key, readStream, boundary, request) {
    return Buffer.concat([
      Buffer.from(this._partHeader(key, path.basename(readStream.path), boundary, request)),
      fs.readFileSync(readStream.path),
      Buffer.from(MultipartRelated._CRLF)
    ]);
  }

  _formPart(key, formPart, boundary, request) {
    let formPartContentType = null;
    let formPartValue = null;
    let contentBuffer = null;

    if (formPart instanceof FormPart) {
      formPartContentType = formPart.headers['content-type'];
      formPartValue = formPart.value;
    }

    if (formPartContentType === 'application/json') {
      contentBuffer = Buffer.from(JSON.stringify(formPartValue) + MultipartRelated._CRLF)
    } else {
      contentBuffer = Buffer.from(formPart + MultipartRelated._CRLF)
    }

    return Buffer.concat([
      Buffer.from(this._partHeader(key, null, boundary, request)),
      contentBuffer
    ]);
  }

  _partHeader(key, filename, boundary, request) {
    let formPart = request.body[key];
    let part = `--${boundary}`;

    part += MultipartRelated._CRLF;
    part += `Content-Disposition: form-data; name="${key}"`;

    if (filename) {
      part += `; filename="${filename}"`;
      part += MultipartRelated._CRLF;
      part += `Content-Type: ${this._filetype(filename)}`;
    }

    if (formPart instanceof FormPart) {
      let partHeaders = formPart.headers;

      if (partHeaders['content-type'] === 'application/json') {
        part += `; filename="${key}.json"`;
      }

      for (const headerKey of Object.keys(partHeaders)) {
        part += MultipartRelated._CRLF;
        part += headerKey + ": " + partHeaders[headerKey];
      }
    }

    part += `${MultipartRelated._CRLF}${MultipartRelated._CRLF}`;

    return part;
  }

  _filetype(filename) {
    let ext = path.extname(filename);

    if (ext === '.jpeg' || ext === '.jpg') {
      return 'image/jpeg';
    } else if (ext === '.png') {
      return 'image/png';
    } else if (ext === '.gif') {
      return 'image/gif';
    } else if (ext === '.pdf') {
      return 'application/pdf';
    }

    return 'application/octet-stream';
  }
}

class FormPart {
  constructor(value, headers) {
    this.headers = {};
    this.value = value;

    Object.keys(headers).forEach( (key) => {
      this.headers[key.toLowerCase()] = headers[key];
    });
  }
}

module.exports = {
  MultipartRelated: MultipartRelated,
  FormPart: FormPart
};
