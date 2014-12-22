
import * as c0 from 'c0'
var { expect } = chai

function read (args) {
  return c0(function * () {
    return args
  })
}


describe('c0(* -> yield {})', function(){
  it('should aggregate several thunks', function(done){
    c0(function *(){
      var a = read('00')
      var b = read('01')
      var c = read('02')

      var res = yield {
        a: a,
        b: b,
        c: c
      }

      expect(Object.keys(res)).to.have.length(3)
      expect(res.a).to.equal('00')
      expect(res.b).to.equal('01')
      expect(res.c).to.equal('02')
    })(done)
  })

  it('should noop with no args', function(done){
    c0(function *(){
      var res = yield {}
      expect(Object.keys(res)).to.have.length(0)
    })(done)
  })

  it('should ignore non-thunkable properties', function(done){
    c0(function *(){
      var foo = {
        name: { first: 'tobi' },
        age: 2,
        address: read('00'),
        tobi: new Pet('tobi'),
        now: new Date
      }

      var res = yield foo

      expect(res.name).to.deep.equal({ first: 'tobi' })
      expect(res.age).to.equal(2)
      expect(res.tobi.name).to.equal('tobi')
      expect(res.now).to.deep.equal(foo.now)
      expect(res.address).to.include('00')
    })(done)
  })

  it('should preserve key order', function(done){
    function timedThunk(time){
      return function(cb){
        setTimeout(cb.bind(null,null,0), time)
      }
    }

    c0(function *(){
      var before = {
        sun: timedThunk(30),
        rain: timedThunk(20),
        moon: timedThunk(10),
      }

      var after = yield before

      var orderBefore = Object.keys(before).join(',')
      var orderAfter = Object.keys(after).join(',')

      expect(orderBefore).to.equal(orderAfter)
    })(done)
  })
})

function Pet(name) {
  this.name = name
  this.something = function(){}
}
