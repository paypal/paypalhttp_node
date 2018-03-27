'use strict';

let Multipart = require('../../../lib/braintreehttp/serializer/multipart');
let FormPart = Multipart.FormPart;

describe('multipart serializer', function () {
  let multipartSerializer = new Multipart.Multipart();

  describe('_filetype', function () {
    it('returns image/jpeg for *.jpg filename', function () {
      assert.equal('image/jpeg', multipartSerializer._filetype('test.jpg'));
    });

    it('returns image/jpeg for *.jpeg filename', function () {
      assert.equal('image/jpeg', multipartSerializer._filetype('test.jpeg'));
    });

    it('returns image/gif for *.gif filename', function () {
      assert.equal('image/gif', multipartSerializer._filetype('test.gif'));
    });

    it('returns application/pdf for *.pdf filename', function () {
      assert.equal('application/pdf', multipartSerializer._filetype('test.pdf'));
    });

    it('returns application/octet-stream for a random filename', function () {
      assert.equal('application/octet-stream', multipartSerializer._filetype('test.tar'));
    });
  });

  describe('FormPart', function () {
    it('Header-Cases variations on content-type', function () {
      let lowerCaseFormPart = new FormPart({key: 'val'}, {'content-type': 'application/json'});
      let shoutCaseFormPart = new FormPart({key: 'val'}, {'CONTENT-TYPE': 'application/json'});

      assert.isTrue(Object.keys(lowerCaseFormPart.headers).indexOf('Content-Type') > -1);
      assert.isTrue(Object.keys(shoutCaseFormPart.headers).indexOf('Content-Type') > -1);
    });

    it('Header-Cases edge case headers', function () {
      let singleCharFormPart = new FormPart({key: 'val'}, {X: 'application/json'});

      assert.isTrue(Object.keys(singleCharFormPart.headers).indexOf('X') > -1);
    });

    it('Header-Cases other common header standards', function () {
      let formPart = new FormPart({key: 'val'}, {'X-security-header': 'application/json'});

      assert.isTrue(Object.keys(formPart.headers).indexOf('X-Security-Header') > -1);
    });
  });
});
