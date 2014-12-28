var {expect} = chai

import {
  annotate,
  hasAnnotation,
  readAnnotations,
  Inject,
  InjectLazy,
  InjectPromise,
  Provide,
  ProvidePromise
} from 'di'

export default function () {
describe('hasAnnotation', () => {

    it('should return false if fn not annotated', () => {

      function foo() {}
      class Bar {}
      class SomeAnnotation {}

      expect(hasAnnotation(foo, SomeAnnotation)).to.equal(false)
      expect(hasAnnotation(Bar, SomeAnnotation)).to.equal(false)
    })


    it('should return true if the fn has an instance of given annotation', () => {

      class SomeAnnotation {}

      annotate(foo, new SomeAnnotation())
      function foo() {}

      expect(hasAnnotation(foo, SomeAnnotation)).to.equal(true)
    })


    it('should return false if fn does not have given annotation', () => {

      class YepAnnotation {}
      class NopeAnnotation {}

      annotate(foo, new YepAnnotation())
      function foo() {}

      expect(hasAnnotation(foo, NopeAnnotation)).to.equal(false)
    })
  })

  describe('readAnnotations', () => {

    it('should read @Provide', () => {
      class Bar {}

      class Foo {}
      annotate(Foo, new Provide(Bar))

      var annotations = readAnnotations(Foo)

      expect(annotations.provide.token).to.equal(Bar)
      expect(annotations.provide.isPromise).to.equal(false)
    })

    it('should read @ProvidePromise', () => {
      class Bar {}

      class Foo {}
      annotate(Foo, new ProvidePromise(Bar))

      var annotations = readAnnotations(Foo)

      expect(annotations.provide.token).to.equal(Bar)
      expect(annotations.provide.isPromise).to.equal(true)
    })

    it('should read @Inject', () => {
      class One {}
      class Two {}

      class Foo {}
      annotate(Foo, new Inject(One, Two))

      var annotations = readAnnotations(Foo)

      expect(annotations.params[0].token).to.equal(One)
      expect(annotations.params[0].isPromise).to.equal(false)
      expect(annotations.params[0].isLazy).to.equal(false)

      expect(annotations.params[1].token).to.equal(Two)
      expect(annotations.params[1].isPromise).to.equal(false)
      expect(annotations.params[1].isLazy).to.equal(false)
    })

    it('should read @InjectLazy', () => {
      class One {}

      class Foo {}
      annotate(Foo, new InjectLazy(One))

      var annotations = readAnnotations(Foo)

      expect(annotations.params[0].token).to.equal(One)
      expect(annotations.params[0].isPromise).to.equal(false)
      expect(annotations.params[0].isLazy).to.equal(true)
    })

    it('should read @InjectPromise', () => {
      class One {}

      class Foo {}
      annotate(Foo, new InjectPromise(One))

      var annotations = readAnnotations(Foo)

      expect(annotations.params[0].token).to.equal(One)
      expect(annotations.params[0].isPromise).to.equal(true)
      expect(annotations.params[0].isLazy).to.equal(false)
    })

    it('should read stacked @Inject{Lazy, Promise} annotations', () => {
      class One {}
      class Two {}
      class Three {}

      class Foo {}
      annotate(Foo, new Inject(One))
      annotate(Foo, new InjectLazy(Two))
      annotate(Foo, new InjectPromise(Three))

      var annotations = readAnnotations(Foo)

      expect(annotations.params[0].token).to.equal(One)
      expect(annotations.params[0].isPromise).to.equal(false)
      expect(annotations.params[0].isLazy).to.equal(false)

      expect(annotations.params[1].token).to.equal(Two)
      expect(annotations.params[1].isPromise).to.equal(false)
      expect(annotations.params[1].isLazy).to.equal(true)

      expect(annotations.params[2].token).to.equal(Three)
      expect(annotations.params[2].isPromise).to.equal(true)
      expect(annotations.params[2].isLazy).to.equal(false)
    })
  })
}


