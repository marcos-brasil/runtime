
import {
  annotate,
  Injector,
  Inject,
  InjectLazy,
  Provide,
  SuperConstructor,
  TransientScope
} from 'di'

import {Car, CyclicEngine} from './fixtures/car'
import {house as houseModule} from './fixtures/house'
import {house as shinyHouseModule} from './fixtures/shiny_house'

var {expect} = chai

export default function () {
  describe('injector', function() {

    it('should instantiate a class without dependencies', function() {
      class Car {
        constructor() {}
        start() {}
      }

      var injector = new Injector()
      var car = injector.get(Car)

      expect(car).to.be.instanceof(Car)
    })

    it('should resolve dependencies based on @Inject annotation', function() {
      class Engine {
        start() {}
      }

      class Car {
        constructor(engine) {
          this.engine = engine
        }

        start() {}
      }
      annotate(Car, new Inject(Engine))

      var injector = new Injector()
      var car = injector.get(Car)

      expect(car).to.be.instanceof(Car)
      expect(car.engine).to.be.instanceof(Engine)
    })

    it('should override providers', function() {
      class Engine {}

      class Car {
        constructor(engine) {
          this.engine = engine
        }

        start() {}
      }
      annotate(Car, new Inject(Engine))

      class MockEngine {
        start() {}
      }
      annotate(MockEngine, new Provide(Engine))

      var injector = new Injector([MockEngine])
      var car = injector.get(Car)

      expect(car).to.be.instanceof(Car)
      expect(car.engine).to.be.instanceof(MockEngine)
    })

    it('should allow factory function', function() {
      class Size {}

      annotate(computeSize, new Provide(Size))
      function computeSize() {
        return 0
      }

      var injector = new Injector([computeSize])
      var size = injector.get(Size)

      expect(size).to.equal(0)
    })

    it('should cache instances', function() {
      class Car {}

      var injector = new Injector()
      var car = injector.get(Car)

      expect(injector.get(Car)).to.equal(car)
    })

    it('should throw when no provider defined', function() {
      var injector = new Injector()

      expect(() => injector.get('NonExisting'))
          .to.throw('No provider for NonExisting!')
    })

    it('should show the full path when no provider defined', function() {
      var injector = new Injector(houseModule)

      expect(() => injector.get('House'))
          .to.throw('No provider for Sink! (House -> Kitchen -> Sink)')
    })

    it('should throw when trying to instantiate a cyclic dependency', function() {
      var injector = new Injector([CyclicEngine])

      expect(() => injector.get(Car))
          .to.throw(/Cannot instantiate cyclic dependency! (.* -> .* -> .*)/)
    })

    it('should show the full path when error happens in a constructor', function() {
      class Engine {
        constructor() {
          throw new Error('This engine is broken!')
        }
      }

      class Car {
        constructor(e) {}
      }
      annotate(Car, new Inject(Engine))

      var injector = new Injector()

      expect(() => injector.get(Car))
        .to.throw(/Error during instantiation of .*! \(.* -> .*\)/)
    })

    it('should throw an error when used in a class without any parent', function() {
      class WithoutParent {}
      annotate(WithoutParent, new Inject(SuperConstructor))

      var injector = new Injector()

      expect(function() {
        injector.get(WithoutParent)
      }).to.throw(/Only classes with a parent can ask for SuperConstructor!/)
    })

    it('should throw an error when null/undefined token requested', function() {
      var injector = new Injector()

      expect(function() {
        injector.get(null)
      }).to.throw(/Invalid token "null" requested!/)

      expect(function() {
        injector.get(undefined)
      }).to.throw(/Invalid token "undefined" requested!/)
    })

    // regression
    it('should show the full path when null/undefined token requested', function() {
      class Foo {}
      annotate(Foo, new Inject(undefined))

      class Bar {}
      annotate(Bar, new Inject(null))

      var injector = new Injector()

      expect(function() {
        injector.get(Foo)
      }).to.throw(/Invalid token "undefined" requested! \(.* -> undefined\)/)

      expect(function() {
        injector.get(Bar)
      }).to.throw(/Invalid token "null" requested! \(.* -> null\)/)
    })

    it('should provide itself', function() {
      var injector = new Injector()

      expect(injector.get(Injector)).to.equal(injector)
    })

    describe('SuperConstructor', function () {

      it('should support "super" to call a parent constructor', function() {
        class Something {}

        class Parent {
          constructor(something) {
            this.parentSomething = something
          }
        }
        annotate(Parent, new Inject(Something))

        class Child extends Parent {
          constructor(superConstructor, something) {
            superConstructor()
            this.childSomething = something
          }
        }

        annotate(Child, new Inject(SuperConstructor, Something))

        var injector = new Injector()
        var instance = injector.get(Child)

        expect(instance.parentSomething).to.be.instanceof(Something)
        expect(instance.childSomething).to.be.instanceof(Something)
        expect(instance.childSomething).to.equal(instance.parentSomething)
      })

      it('should support "super" to call multiple parent constructors', function() {
        class Foo {}
        class Bar {}

        class Parent {
          constructor(foo) {
            this.parentFoo = foo
          }
        }
        annotate(Parent, new Inject(Foo))

        class Child extends Parent {
          constructor(superConstructor, foo) {
            superConstructor()
            this.childFoo = foo
          }
        }
        annotate(Child, new Inject(SuperConstructor, Foo))

        class GrandChild extends Child {
          constructor(superConstructor, foo, bar) {
            superConstructor()
            this.grandChildBar = bar
            this.grandChildFoo = foo
          }
        }

        annotate(GrandChild, new Inject(SuperConstructor, Foo, Bar))

        var injector = new Injector()
        var instance = injector.get(GrandChild)

        expect(instance.parentFoo).to.be.instanceof(Foo)
        expect(instance.childFoo).to.be.instanceof(Foo)
        expect(instance.grandChildFoo).to.be.instanceof(Foo)
        expect(instance.grandChildBar).to.be.instanceof(Bar)
      })

      it('should throw an error when used in a factory function', function() {
        class Something {}

        annotate(createSomething, new Provide(Something))
        annotate(createSomething, new Inject(SuperConstructor))
        function createSomething() {}

        expect(function() {
          var injector = new Injector([createSomething])
          injector.get(Something)
        }).to.throw(/Only classes with a parent can ask for SuperConstructor!/)
      })

    })



    describe('transient', function() {

      it('should never cache', function() {
        class Foo {}
        annotate(Foo, new TransientScope())

        var injector = new Injector()
        expect(injector.get(Foo)).not.to.equal(injector.get(Foo))
      })

      it('should always use dependencies (default providers) from the youngest injector', function() {
        class Foo {}
        annotate(Foo, new Inject())

        class AlwaysNewInstance {
          constructor(foo) {
            this.foo = foo
          }
        }
        annotate(AlwaysNewInstance, new TransientScope())
        annotate(AlwaysNewInstance, new Inject(Foo))

        var injector = new Injector()
        var child = injector.createChild([Foo]) // force new instance of Foo

        var fooFromChild = child.get(Foo)
        var fooFromParent = injector.get(Foo)

        var alwaysNew1 = child.get(AlwaysNewInstance)
        var alwaysNew2 = child.get(AlwaysNewInstance)
        var alwaysNewFromParent = injector.get(AlwaysNewInstance)

        expect(alwaysNew1.foo).to.equal(fooFromChild)
        expect(alwaysNew2.foo).to.equal(fooFromChild)
        expect(alwaysNewFromParent.foo).to.equal(fooFromParent)
      })

      it('should always use dependencies from the youngest injector', function() {
        class Foo {}
        annotate(Foo, new Inject())

        class AlwaysNewInstance {
          constructor(foo) {
            this.foo = foo
          }
        }
        annotate(AlwaysNewInstance, new TransientScope())
        annotate(AlwaysNewInstance, new Inject(Foo))

        var injector = new Injector([AlwaysNewInstance])
        var child = injector.createChild([Foo]) // force new instance of Foo

        var fooFromChild = child.get(Foo)
        var fooFromParent = injector.get(Foo)

        var alwaysNew1 = child.get(AlwaysNewInstance)
        var alwaysNew2 = child.get(AlwaysNewInstance)
        var alwaysNewFromParent = injector.get(AlwaysNewInstance)

        expect(alwaysNew1.foo).to.equal(fooFromChild)
        expect(alwaysNew2.foo).to.equal(fooFromChild)
        expect(alwaysNewFromParent.foo).to.equal(fooFromParent)
      })
    })

    describe('child', function() {

      it('should load instances from parent injector', function() {
        class Car {
          start() {}
        }

        var parent = new Injector([Car])
        var child = parent.createChild([])

        var carFromParent = parent.get(Car)
        var carFromChild = child.get(Car)

        expect(carFromChild).to.equal(carFromParent)
      })

      it('should create new instance in a child injector', function() {
        class Car {
          start() {}
        }

        class MockCar {
          start() {}
        }
        annotate(MockCar, new Provide(Car))

        var parent = new Injector([Car])
        var child = parent.createChild([MockCar])

        var carFromParent = parent.get(Car)
        var carFromChild = child.get(Car)

        expect(carFromParent).not.to.equal(carFromChild)
        expect(carFromChild).to.be.instanceof(MockCar)
      })

      it('should force new instances by annotation', function() {
        class RouteScope {}

        class Engine {
          start() {}
        }

        class Car {
          constructor(engine) {
            this.engine = engine
          }

          start() {}
        }
        annotate(Car, new RouteScope())
        annotate(Car, new Inject(Engine))

        var parent = new Injector([Car, Engine])
        var child = parent.createChild([], [RouteScope])

        var carFromParent = parent.get(Car)
        var carFromChild = child.get(Car)

        expect(carFromChild).not.to.equal(carFromParent)
        expect(carFromChild.engine).to.equal(carFromParent.engine)
      })

      it('should force new instances by annotation using overridden provider', function() {
        class RouteScope {}

        class Engine {
          start() {}
        }

        class MockEngine {
          start() {}
        }
        annotate(MockEngine, new RouteScope())
        annotate(MockEngine, new Provide(Engine))

        var parent = new Injector([MockEngine])
        var childA = parent.createChild([], [RouteScope])
        var childB = parent.createChild([], [RouteScope])

        var engineFromA = childA.get(Engine)
        var engineFromB = childB.get(Engine)

        expect(engineFromA).not.to.equal(engineFromB)
        expect(engineFromA).to.be.instanceof(MockEngine)
        expect(engineFromB).to.be.instanceof(MockEngine)
      })

      it('should force new instance by annotation using the lowest overridden provider', function() {
        class RouteScope {}

        class Engine {
          constructor() {}
          start() {}
        }
        annotate(Engine, new RouteScope())

        class MockEngine {
          constructor() {}
          start() {}
        }
        annotate(MockEngine, new Provide(Engine))
        annotate(MockEngine, new RouteScope())

        class DoubleMockEngine {
          start() {}
        }
        annotate(DoubleMockEngine, new Provide(Engine))
        annotate(DoubleMockEngine, new RouteScope())

        var parent = new Injector([Engine])
        var child = parent.createChild([MockEngine])
        var grantChild = child.createChild([], [RouteScope])

        var engineFromParent = parent.get(Engine)
        var engineFromChild = child.get(Engine)
        var engineFromGrantChild = grantChild.get(Engine)

        expect(engineFromParent).to.be.instanceof(Engine)
        expect(engineFromChild).to.be.instanceof(MockEngine)
        expect(engineFromGrantChild).to.be.instanceof(MockEngine)
        expect(engineFromGrantChild).not.to.equal(engineFromChild)
      })

      it('should show the full path when no provider', function() {
        var parent = new Injector(houseModule)
        var child = parent.createChild(shinyHouseModule)

        expect(() => child.get('House'))
            .to.throw('No provider for Sink! (House -> Kitchen -> Sink)')
      })

      it('should provide itself', function() {
        var parent = new Injector()
        var child = parent.createChild([])

        expect(child.get(Injector)).to.equal(child)
      })

      it('should cache default provider in parent injector', function() {
        class Foo {}
        annotate(Foo, new Inject())

        var parent = new Injector()
        var child = parent.createChild([])

        var fooFromChild = child.get(Foo)
        var fooFromParent = parent.get(Foo)

        expect(fooFromParent).to.equal(fooFromChild)
      })

      it('should force new instance by annotation for default provider', function() {
        class RequestScope {}

        class Foo {}
        annotate(Foo, new Inject())
        annotate(Foo, new RequestScope())

        var parent = new Injector()
        var child = parent.createChild([], [RequestScope])

        var fooFromChild = child.get(Foo)
        var fooFromParent = parent.get(Foo)

        expect(fooFromParent).not.to.equal(fooFromChild)
      })
    })

    describe('lazy', function() {

      it('should instantiate lazily', function() {
        var constructorSpy = sinon.spy()

        class ExpensiveEngine {
          constructor() {
            constructorSpy()
          }
        }

        class Car {
          constructor(createEngine) {
            this.engine = null
            this.createEngine = createEngine
          }

          start() {
            this.engine = this.createEngine()
          }
        }
        annotate(Car, new InjectLazy(ExpensiveEngine))

        var injector = new Injector()
        var car = injector.get(Car)

        expect(constructorSpy).not.to.have.been.called

        car.start()
        expect(constructorSpy).to.have.been.called
        expect(car.engine).to.be.instanceof(ExpensiveEngine)
      })

      // regression
      it('should instantiate lazily from a parent injector', function() {
        var constructorSpy = sinon.spy()

        class ExpensiveEngine {
          constructor() {
            constructorSpy()
          }
        }

        class Car {
          constructor(createEngine) {
            this.engine = null
            this.createEngine = createEngine
          }

          start() {
            this.engine = this.createEngine()
          }
        }
        annotate(Car, new InjectLazy(ExpensiveEngine))

        var injector = new Injector([ExpensiveEngine])
        var childInjector = injector.createChild([Car])
        var car = childInjector.get(Car)

        expect(constructorSpy).not.to.have.been.called

        car.start()
        expect(constructorSpy).to.have.been.called
        expect(car.engine).to.be.instanceof(ExpensiveEngine)
      })

      describe('with locals', function() {

        it('should always create a new instance', function() {
          var constructorSpy = sinon.spy()

          class ExpensiveEngine {
            constructor(power) {
              constructorSpy()
              this.power = power
            }
          }
          annotate(ExpensiveEngine, new TransientScope())
          annotate(ExpensiveEngine, new Inject('power'))

          class Car {
            constructor(createEngine) {
              this.createEngine = createEngine
            }
          }
          annotate(Car, new InjectLazy(ExpensiveEngine))

          var injector = new Injector()
          var car = injector.get(Car)

          var veyronEngine = car.createEngine('power', 1184)
          var mustangEngine = car.createEngine('power', 420)

          expect(veyronEngine).not.to.equal(mustangEngine)
          expect(veyronEngine.power).to.equal(1184)
          expect(mustangEngine.power).to.equal(420)

          var mustangEngine2 = car.createEngine('power', 420)
          expect(mustangEngine).not.to.equal(mustangEngine2)
        })
      })
    })
  })
}

