'use strict';

let fs = require('fs');
let path = require('path');

class Multipart {
  static get _CRLF() {
    return '\r\n';
  }

  encode(request) {
    let boundary = 'boundary' + Date.now();

    request.headers['Content-Type'] += `; boundary=${boundary}`;
    let requestBody = '';

    for (const key of Object.keys(request.body)) {
      let val = request.body[key];

      if (val instanceof fs.ReadStream) {
        requestBody += this._filePart(key, val, boundary);
      } else {
        requestBody += this._formPart(key, val, boundary);
      }
    }

    requestBody += `--${boundary}--`;
    requestBody += Multipart._CRLF;
    requestBody += Multipart._CRLF;

    return requestBody;
  }

  decode() {
    throw new Error('Multipart does not support deserialization.');
  }

  contentType() {
    return /^multipart\/.*/;
  }

  _filePart(key, readStream, boundary) {
    let b = this._partHeader(key, path.basename(readStream.path), boundary);

    let fileData = fs.readFileSync(readStream.path);

    b += fileData;
    b += Multipart._CRLF;

    return b;
  }

  _formPart(key, formPart, boundary) {
    let b = this._partHeader(key, null, boundary);

    b += formPart;
    b += Multipart._CRLF;

    return b;
  }

  _partHeader(key, filename, boundary) {
    let b = `--${boundary}`;

    b += Multipart._CRLF;
    b += `Content-Disposition: form-data; name="${key}"`;
    if (filename) {
      b += `; filename="${filename}"`;
      b += Multipart._CRLF;
      b += `Content-Type: ${this._filetype(filename)}`;
    }
    b += Multipart._CRLF;
    b += Multipart._CRLF;

    return b;
  }

  _filetype(filename) {
    let ext = path.extname(filename);

    if (ext === '.jpeg' || ext === '.jpg') {
      return 'image/jpeg';
    } else if (ext === '.png') {
      return 'image/png';
    } else if (ext === '.pdf') {
      return 'application/pdf';
    }

    return 'application/octet-stream';
  }
}

module.exports.Multipart = Multipart;
