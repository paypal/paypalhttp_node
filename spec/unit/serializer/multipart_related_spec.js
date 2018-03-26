'use strict';

let MultipartRelated = require('../../../lib/braintreehttp/serializer/multipart_related');
let fs = require('fs');
let zlib = require('zlib');

describe('multipart related serializer', function () {
  let multipartRelatedSerializer = new MultipartRelated.MultipartRelated();

  describe('_filetype', function () {
    it('returns image/jpeg for *.jpg filename', function () {
      assert.equal('image/jpeg', multipartRelatedSerializer._filetype("test.jpg"));
    });

    it('returns image/jpeg for *.jpeg filename', function () {
      assert.equal('image/jpeg', multipartRelatedSerializer._filetype("test.jpeg"));
    });

    it('returns image/gif for *.gif filename', function () {
      assert.equal('image/gif', multipartRelatedSerializer._filetype("test.gif"));
    });

    it('returns application/pdf for *.pdf filename', function () {
      assert.equal('application/pdf', multipartRelatedSerializer._filetype("test.pdf"));
    });

    it('returns application/octet-stream for a random filename', function () {
      assert.equal('application/octet-stream', multipartRelatedSerializer._filetype("test.tar"));
    });
  });
});
