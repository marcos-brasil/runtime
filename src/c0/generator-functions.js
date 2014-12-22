
import * as c0 from 'c0'
var { assert, expect } = chai

function * work() {
  yield  setImmediate
  return 'yay'
}

describe('c0(fn)', function(){
  describe('with a generator function', function(){
    it('should wrap with c0()', function(done){
      c0(function *(){
        var a = yield work
        var b = yield work
        var c = yield work

        assert('yay' === a)
        assert('yay' === b)
        assert('yay' === c)

        var res = yield [work, work, work]
        expect(res).to.deep.equal(['yay', 'yay', 'yay'])
      })(done)
    })

    it('should catch errors', function(done){
      c0(function *(){
        yield function *(){
          throw new Error('boom')
        }
      })(function(err){
        assert(err)
        assert(err.message === 'boom')
        done()
      })
    })
  })
})
