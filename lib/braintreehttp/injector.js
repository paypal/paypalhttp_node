'use strict';

class Injector {
  inject() {
    throw new Error('Must be overriden by subclass');
  }

}

module.exports = {Injector: Injector};
