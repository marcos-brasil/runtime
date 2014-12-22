
import * as c0 from 'c0'

var {expect} = chai

function read (args) {
  return c0(function * () {
    return args
  })
}


describe('c0(* -> yield [])', function(){
  it('should aggregate several thunks', function(done){
    c0(function *(){
      var a = read('00')
      var b = read('01')
      var c = read('02')

      var res = yield [a, b, c]

      expect(res).to.have.length(3)
      expect(res[0]).to.equal('00')
      expect(res[1]).to.equal('01')
      expect(res[2]).to.equal('02')

    })(done)
  })

  it('should noop with no args', function(done){
    c0(function *(){
      var res = yield []
      expect(res).to.have.length(0)
    })(done)
  })
})
