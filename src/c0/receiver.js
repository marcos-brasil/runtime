import * as c0 from 'c0'
var { assert } = chai

var ctx = {
  foo: 'bar'
}

describe('c0(receiver).call(ctx)', function(){
  it('should set immediate gen receiver', function(done){
    c0(function *(){
      assert(ctx === this)
    }).call(ctx, done)
  })

  it('should set delegate generator receiver', function(done){
    function *bar() {
      assert(ctx === this)
    }

    function *foo() {
      assert(ctx === this)
      yield bar
    }

    c0(function *(){
      assert(ctx === this)
      yield foo
    }).call(ctx, done)
  })

  it('should set function receiver', function(done){
    function foo(done) {
      assert(this === ctx)
      done()
    }

    c0(function *(){
      assert(ctx === this)
      yield foo
    }).call(ctx, done)
  })

  it('should set join delegate generator receiver', function(done){
    function *baz() {
      assert(ctx === this)
    }

    function *bar() {
      assert(ctx === this)
    }

    function *foo() {
      assert(ctx === this)
    }

    c0(function *(){
      assert(ctx === this)
      yield [foo, bar, baz]
    }).call(ctx, done)
  })

  it('should set join function receiver', function(done){
    function baz(done) {
      assert(ctx === this)
      done()
    }

    function bar(done) {
      assert(ctx === this)
      done()
    }

    function foo(done) {
      assert(ctx === this)
      done()
    }

    c0(function *(){
      assert(ctx === this)
      yield [foo, bar, baz]
    }).call(ctx, done)
  })
})

describe('c0(receiver)(args...)', function(){
  it('should pass arguments to the receiver', function(done){
    c0(function *(a, b, c){
      assert(a === 1)
      assert(b === 2)
      assert(c === 3)
    })(1, 2, 3, done)
  })

  it('should not pass the callback to the receiver', function(done){
    c0(function *(a, b, c){
      assert(arguments.length === 3)
    })(1, 2, 3, done)
  })

  it('should work when less arguments are passed than expected', function(done){
    c0(function *(a, b, c){
      assert(a === 1)
      assert(arguments.length === 1)
    })(1, done)
  })

  it('should work without a callback', function(){
    c0(function *(a, b, c){
      assert(a === 1)
      assert(arguments.length === 1)
    })(1)
  })
})
