import * as c0 from 'c0'
var { assert, expect } = chai

function getPromise(val, err) {
  return new Promise(function (resolve, reject) {
    if (err) { reject(err) }
    else { resolve(val) }
  })
}

describe('c0(fn)', function(){
  describe('with one promise yield', function(){
    it('should work', function(done){
      c0(function *(){
        var a = yield getPromise(1)
        expect(a).to.equal(1)
      })(done)
    })
  })

  describe('with several promise yields', function(){
    it('should work', function(done){
      c0(function *(){
        var a = yield getPromise(1)
        var b = yield getPromise(2)
        var c = yield getPromise(3)

        expect([a,b,c]).to.deep.equal([1,2,3])
      })(done)
    })
  })

  describe('when a promise is rejected', function(){
    it('should throw and resume', function(done){
      var error

      c0(function *(){
        try {
          yield getPromise(1, new Error('boom'))
        } catch (err) {
          error = err
        }

        assert('boom' === error.message)
        var ret = yield getPromise(1)
        assert(1 === ret)
      })(done)
    })
  })
})
