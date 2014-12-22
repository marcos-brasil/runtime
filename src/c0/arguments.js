/* global chai */

import * as c0 from 'c0'
var { assert } = chai

describe('c0()(args...)', function(){
  it('should not pass the thunk as an arguments', c0(function *(){
    assert.equal(arguments.length, 0);
  }))

  it('should not pass error for nil first argument', function(done){
    c0(function *(i){
      assert.equal(i, 0);
    })(0, done);
  });
})
