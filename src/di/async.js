
import {
  annotate,
  Injector,
  Inject,
  InjectPromise,
  ProvidePromise,
  TransientScope
} from 'di'

var {expect} = chai


class UserList {}

// An async provider.
annotate(fetchUsers, new ProvidePromise(UserList))
function fetchUsers() {
  return Promise.resolve(new UserList())
}

class SynchronousUserList {}

class UserController {
  constructor(list) {
    this.list = list
  }
}
annotate(UserController, new Inject(UserList))

class SmartUserController {
  constructor(promise) {
    this.promise = promise
  }
}
annotate(SmartUserController, new InjectPromise(UserList))

export default function () {
  describe('async', () => {

    it('should return a promise', () => {
      var injector = new Injector([fetchUsers])
      var p = injector.getPromise(UserList)

      expect(p).to.be.instanceof(Promise)
    })

    it('should throw when instantiating promise provider synchronously', () => {
      var injector = new Injector([fetchUsers])

      expect(() => injector.get(UserList))
          .to.throw(/Cannot instantiate .* synchronously\. It is provided as a promise!/)
    })

    it('should return promise even if the provider is sync', () => {
      var injector = new Injector()
      var p = injector.getPromise(SynchronousUserList)

      expect(p).to.be.instanceof(Promise)
    })

    // regression
    it('should return promise even if the provider is sync, from cache', () => {
      var injector = new Injector()
      /* jshint -W004 */
      var p1 = injector.getPromise(SynchronousUserList)
      var p1 = injector.getPromise(SynchronousUserList)
      /* jshint +W004 */

      expect(p1).to.be.instanceof(Promise)
    })

    it('should return promise when a dependency is async', (done) => {
      var injector = new Injector([fetchUsers])

      injector.getPromise(UserController).then(function(userController) {
        expect(userController).to.be.instanceof(UserController)
        expect(userController.list).to.be.instanceof(UserList)
        done()
      }).catch((err)=>{console.log(err)})
    })

    // regression
    it('should return a promise even from parent injector', () => {
      var injector = new Injector([SynchronousUserList])
      var childInjector = injector.createChild([])

      expect(childInjector.getPromise(SynchronousUserList)).to.be.instanceof(Promise)
    })

    it('should throw when a dependency is async', () => {
      var injector = new Injector([fetchUsers])

      expect(() => injector.get(UserController))
          .to.throw(/Cannot instantiate .* synchronously\. It is provided as a promise! (.* -> .*)/)
    })

    it('should resolve synchronously when async dependency requested as a promise', () => {
      var injector = new Injector([fetchUsers])
      var controller = injector.get(SmartUserController)

      expect(controller).to.be.instanceof(SmartUserController)
      expect(controller.promise).to.be.instanceof(Promise)
    })

    // regression
    it('should not cache TransientScope', (done) => {

      class NeverCachedUserController {
        constructor(list) {
          this.list = list
        }
      }
      annotate(NeverCachedUserController, new TransientScope())
      annotate(NeverCachedUserController, new Inject(UserList))

      var injector = new Injector([fetchUsers])

      injector.getPromise(NeverCachedUserController).then((controller1) => {
        injector.getPromise(NeverCachedUserController).then((controller2) => {
          expect(controller1).not.to.equal(controller2)
          done()
        })
      })
    })

    it('should allow async dependency in a parent constructor', (done) => {
      class ChildUserController extends UserController {}

      var injector = new Injector([fetchUsers])

      injector.getPromise(ChildUserController).then(function(childUserController) {
        expect(childUserController).to.be.instanceof(ChildUserController)
        expect(childUserController.list).to.be.instanceof(UserList)
        done()
      })
    })
  })
}


