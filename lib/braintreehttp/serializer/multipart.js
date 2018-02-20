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

    let buffers = [];

    for (const key of Object.keys(request.body)) {
      let val = request.body[key];

      if (val instanceof fs.ReadStream) {
        buffers.push(this._filePart(key, val, boundary));
      } else {
        buffers.push(this._formPart(key, val, boundary));
      }
    }

    buffers.push(Buffer.from(`--${boundary}--`));
    buffers.push(Buffer.from(Multipart._CRLF));
    buffers.push(Buffer.from(Multipart._CRLF));

    return Buffer.concat(buffers);
  }

  decode() {
    throw new Error('Multipart does not support deserialization.');
  }

  contentType() {
    return /^multipart\/.*/;
  }

  _filePart(key, readStream, boundary) {
    return Buffer.concat([
      Buffer.from(this._partHeader(key, path.basename(readStream.path), boundary)),
      fs.readFileSync(readStream.path),
      Buffer.from(Multipart._CRLF)
    ]);
  }

  _formPart(key, formPart, boundary) {
    return Buffer.concat([
      Buffer.from(this._partHeader(key, null, boundary)),
      Buffer.from(formPart + Multipart._CRLF)
    ]);
  }

  _partHeader(key, filename, boundary) {
    let part = `--${boundary}`;

    part += Multipart._CRLF;
    part += `Content-Disposition: form-data; name="${key}"`;

    if (filename) {
      part += `; filename="${filename}"`;
      part += Multipart._CRLF;
      part += `Content-Type: ${this._filetype(filename)}`;
    }

    part += `${Multipart._CRLF}${Multipart._CRLF}`;

    return part;
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
