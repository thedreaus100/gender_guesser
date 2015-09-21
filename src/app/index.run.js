(function() {
  'use strict';

  angular
    .module('genderGuesser')
    .run(runBlock);

  /** @ngInject */
  function runBlock($log) {

    $log.debug('runBlock end');
  }

})();
