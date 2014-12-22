import * as c0 from 'c0'
var { expect } = chai

function read (args) {
  return c0(function * () {
    return args
  })
}


describe('c0() recursion', function(){
  it('should aggregate arrays within arrays', function(done){
    c0(function *(){
      var a = read('00')
      var b = read('01')
      var c = read('02')

      var res = yield [a, [b, c]]
      expect(res).to.have.length(2)
      expect(res[0]).to.equal('00')
      expect(res[1]).to.have.length(2)
      expect(res[1][0]).to.equal('01')
      expect(res[1][1]).to.equal('02')
    })(done)
  })

  it('should aggregate objects within objects', function(done){
    c0(function *(){
      var a = read('00')
      var b = read('01')
      var c = read('02')

      var res = yield {
        0: a,
        1: {
          0: b,
          1: c
        }
      }

      expect(res[0]).to.equal('00')
      expect(res[1][0]).to.equal('01')
      expect(res[1][1]).to.equal('02')
    })(done)
  })
})
