import * as c0 from 'c0'
var { assert, expect } = chai

function get(val, err, error) {
  return function(done){
    if (error) { throw error }
    setImmediate(function(){
      done(err, val)
    })
  }
}

describe('c0(fn)', function(){
  describe('with no yields', function(){
    it('should work', function(done){
      c0(function *(){})(done)
    })
  })

  describe('with one yield', function(){
    it('should work', function(done){
      c0(function *(){
        var a = yield get(1)
        expect(a).to.equal(1)
      })(done)
    })
  })

  describe('with several yields', function(){
    it('should work', function(done){
      c0(function *(){
        var a = yield get(1)
        var b = yield get(2)
        var c = yield get(3)

        expect([a,b,c]).to.deep.equal([1,2,3])
      })(done)
    })
  })

  describe('with many arguments', function(){
    it('should return an array', function(done){
      function exec(cmd) {
        return function(done){
          done(null, 'stdout', 'stderr')
        }
      }

      c0(function *(){
        var out = yield exec('something')
        expect(out).to.deep.equal(['stdout', 'stderr'])
      })(done)
    })
  })

  describe('when the function throws', function(){
    it('should be caught', function(done){
      c0(function *(){
        try {
          yield get(1, null, new Error('boom'))
        } catch (err) {
          expect(err.message).to.equal('boom')
        }
      })(done)
    })
  })

  describe('when an error is passed then thrown', function(){
    it('should only catch the first error only', function(done){
      c0(function *() {
        yield function (done){
          done(new Error('first'))
          throw new Error('second')
        }
      })(function(err){
        expect(err.message).to.equal('first')
        done()
      })
    })
  })

  describe('when an error is passed', function(){
    it('should throw and resume', function(done){
      var error

      c0(function *(){
        try {
          yield get(1, new Error('boom'))
        } catch (err) {
          error = err
        }

        assert('boom' === error.message)
        var ret = yield get(1)
        assert(1 === ret)
      })(done)
    })
  })

  describe('with nested c0()s', function(){
    it('should work', function(done){
      var hit = []

      c0(function *(){
        var a = yield get(1)
        var b = yield get(2)
        var c = yield get(3)
        hit.push('one')

        expect([a,b,c]).to.deep.equal([1,2,3])

        yield c0(function *(){
          hit.push('two')
          var a = yield get(1)
          var b = yield get(2)
          var c = yield get(3)

          expect([a,b,c]).to.deep.equal([1,2,3])

          yield c0(function *(){
            hit.push('three')
            var a = yield get(1)
            var b = yield get(2)
            var c = yield get(3)

            expect([a,b,c]).to.deep.equal([1,2,3])
          })
        })

        yield c0(function *(){
          hit.push('four')
          var a = yield get(1)
          var b = yield get(2)
          var c = yield get(3)

          expect([a,b,c]).to.deep.equal([1,2,3])
        })

        expect(hit).to.deep.equal(['one', 'two', 'three', 'four'])
      })(done)
    })
  })

  describe('return values', function(){
    describe('with a callback', function(){
      it('should be passed', function(done){
        var fn = c0(function *(){
          return [
            yield get(1),
            yield get(2),
            yield get(3)
          ]
        })

        fn(function(err, res){
          if (err) { return done(err) }
          expect(res).to.deep.equal([1,2,3])
          done()
        })
      })
    })

    describe('when nested', function(){
      it('should return the value', function(done){
        var fn = c0(function *(){
          var other = yield c0(function *(){
            return [
              yield get(4),
              yield get(5),
              yield get(6)
            ]
          })

          return [
            yield get(1),
            yield get(2),
            yield get(3)
          ].concat(other)
        })

        fn(function(err, res){
          if (err) { return done(err) }
          expect(res).to.deep.equal([1,2,3,4,5,6])
          done()
        })
      })
    })
  })

  describe('when yielding neither a function nor a promise', function(){
    it('should throw', function(done){
      var errors = []

      c0(function *(){
        try {
          yield 'something'
        } catch (err) {
          errors.push(err.message)
        }

        try {
          yield 'something'
        } catch (err) {
          errors.push(err.message)
        }

        expect(errors).to.have.length(2)
        var msg = 'yield a function, promise, generator, array, or object'
        expect(!!errors[0].match(msg)).to.equal(true)
        expect(!!errors[1].match(msg)).to.equal(true)
      })(done)
    })
  })

  describe('with errors', function(){
    it('should throw', function(done){
      var errors = []

      c0(function *(){
        try {
          yield get(1, new Error('foo'))
        } catch (err) {
          errors.push(err.message)
        }

        try {
          yield get(1, new Error('bar'))
        } catch (err) {
          errors.push(err.message)
        }

        expect(errors).to.deep.equal(['foo', 'bar'])
      })(done)
    })

    it('should catch errors on .send()', function(done){
      var errors = []

      c0(function *(){
        try {
          yield get(1, null, new Error('foo'))
        } catch (err) {
          errors.push(err.message)
        }

        try {
          yield get(1, null, new Error('bar'))
        } catch (err) {
          errors.push(err.message)
        }

        expect(errors).to.deep.equal(['foo', 'bar'])
      })(done)
    })

    it('should pass future errors to the callback', function(done){
      c0(function *(){
        yield get(1)
        yield get(2, null, new Error('fail'))
        assert(false)
        yield get(3)
      })(function(err){
        expect(err.message).to.equal('fail')
        done()
      })
    })

    it('should pass immediate errors to the callback', function(done){
      c0(function *(){
        yield get(1)
        yield get(2, new Error('fail'))
        assert(false)
        yield get(3)
      })(function(err){
        expect(err.message).to.equal('fail')
        done()
      })
    })

    it('should catch errors on the first invocation', function(done){
      c0(function *(){
        throw new Error('fail')
      })(function(err){
        expect(err.message).to.equal('fail')
        done()
      })
    })
  })
})

