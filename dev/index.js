(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * slice() reference.
 */

var slice = Array.prototype.slice;

/**
 * Expose `co`.
 */

module.exports = c0;


/**
 * Wrap the given generator `fn` and
 * return a thunk.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

function c0(fn) {
  var isGenFun = isGeneratorFunction(fn);

  return function _co (done) {
    var ctx = this;

    // in toThunk() below we invoke c0()
    // with a generator, so optimize for
    // this case
    var gen = fn;

    // we only need to parse the arguments
    // if gen is a generator function.
    if (isGenFun) {
      var args = slice.call(arguments), len = args.length;
      var hasCallback = len && 'function' == typeof args[len - 1];
      done = hasCallback ? args.pop() : error;
      gen = fn.apply(this, args);
    } else {
      done = done || error;
    }

    next();

    // #92
    // wrap the callback in a setImmediate
    // so that any of its errors aren't caught by `co`
    function exit(err, res) {
      if (!err) return done.call(ctx, err, res);

      // setImmediate(function _exit () {
        done.call(ctx, err, res);
      // });
    }

    function next (err, res) {
      var ret;

      // multiple args
      if (arguments.length > 2) res = slice.call(arguments, 1);

      // error
      if (err) {
        try {
          ret = gen.throw(err);
        } catch (e) {
          return exit(e);
        }
      }

      // ok
      if (!err) {
        try {
          ret = gen.next(res);
        } catch (e) {
          return exit(e);
        }
      }

      // done
      if (ret.done) return exit(null, ret.value);

      // normalize
      ret.value = toThunk(ret.value, ctx);

      // run
      if ('function' == typeof ret.value) {
        var called = false;
        try {
          ret.value.call(ctx, function _retValue () {
            if (called) return;
            called = true;
            next.apply(ctx, arguments);
          });
        } catch (e) {
          // setImmediate(function(){
            if (called) return;
            called = true;
            next(e);
          // });
        }
        return;
      }

      // invalid
      next(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following was passed: "' + String(ret.value) + '"'));
    }
  }
}

/**
 * Convert `obj` into a normalized thunk.
 *
 * @param {Mixed} obj
 * @param {Mixed} ctx
 * @return {Function}
 * @api private
 */
module.exports.toThunk = toThunk;
function toThunk(obj, ctx) {

  if (isGeneratorFunction(obj)) {
    return c0(obj.call(ctx));
  }

  if (isGenerator(obj)) {
    return c0(obj);
  }

  if (isPromise(obj)) {
    return promiseToThunk(obj);
  }

  if ('function' == typeof obj) {
    return obj;
  }

  if (isObject(obj) || Array.isArray(obj)) {
    return objectToThunk.call(ctx, obj);
  }

  return obj;
}

/**
 * Convert an object of yieldables to a thunk.
 *
 * @param {Object} obj
 * @return {Function}
 * @api private
 */

module.exports.objectToThunk = objectToThunk;
function objectToThunk(obj){
  var ctx = this;
  var isArray = Array.isArray(obj);

  return function _objectToThunk (done) {
    var keys = Object.keys(obj);
    var pending = keys.length;
    var results = isArray
      ? new Array(pending) // predefine the array length
      : new obj.constructor();
    var finished;

    if (!pending) {
      // setImmediate(function(){
        done(null, results)
      // });
      return;
    }

    // prepopulate object keys to preserve key ordering
    if (!isArray) {
      for (var i = 0; i < pending; i++) {
        results[keys[i]] = undefined;
      }
    }

    for (var i = 0; i < keys.length; i++) {
      run(obj[keys[i]], keys[i]);
    }

    function run(fn, key) {
      if (finished) return;
      try {
        fn = toThunk(fn, ctx);

        if ('function' != typeof fn) {
          results[key] = fn;
          return --pending || done(null, results);
        }

        fn.call(ctx, function _runFn (err, res){
          if (finished) return;

          if (err) {
            finished = true;
            return done(err);
          }

          results[key] = res;
          --pending || done(null, results);
        });
      } catch (err) {
        finished = true;
        done(err);
      }
    }
  }
}

/**
 * Convert `promise` to a thunk.
 *
 * @param {Object} promise
 * @return {Function}
 * @api private
 */

module.exports.promiseToThunk = promiseToThunk;
function promiseToThunk(promise) {
  return function _promiseToThunk (fn){
    promise.then(function _promiseToThunkThen (res) {
      fn(null, res);
    }, fn);
  }
}

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isPromise(obj) {
  return obj && 'function' == typeof obj.then;
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator(obj) {
  return obj && 'function' == typeof obj.next && 'function' == typeof obj.throw;
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGeneratorFunction(obj) {
  return obj && obj.constructor && 'GeneratorFunction' == obj.constructor.name;
}

/**
 * Check for plain object.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api private
 */

function isObject(val) {
  return val && Object == val.constructor;
}

/**
 * Throw `err` in a new stack.
 *
 * This is used when c0() is invoked
 * without supplying a callback, which
 * should only be for demonstrational
 * purposes.
 *
 * releasing Zalgo (breaking the sync API contract)
 * see: http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony
 * for more info on async VS sync APIs
 *
 * @param {Error} err
 * @api private
 */

function error(err) {
  if (!err) return;
  setImmediate(function _error (){
    throw err;
  });
}

},{}],2:[function(require,module,exports){
"use strict";

var _slice = Array.prototype.slice;
var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

exports.annotate = annotate;
exports.hasAnnotation = hasAnnotation;
exports.readAnnotations = readAnnotations;
var isFunction = require('./util').isFunction;
var SuperConstructor = function SuperConstructor() {};

exports.SuperConstructor = SuperConstructor;
var TransientScope = function TransientScope() {};

exports.TransientScope = TransientScope;
var Inject = function Inject() {
  var tokens = _slice.call(arguments);

  this.tokens = tokens;
  this.isPromise = false;
  this.isLazy = false;
};

exports.Inject = Inject;
var InjectPromise = (function (Inject) {
  var InjectPromise = function InjectPromise() {
    var tokens = _slice.call(arguments);

    this.tokens = tokens;
    this.isPromise = true;
    this.isLazy = false;
  };

  _extends(InjectPromise, Inject);

  return InjectPromise;
})(Inject);

exports.InjectPromise = InjectPromise;
var InjectLazy = (function (Inject) {
  var InjectLazy = function InjectLazy() {
    var tokens = _slice.call(arguments);

    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = true;
  };

  _extends(InjectLazy, Inject);

  return InjectLazy;
})(Inject);

exports.InjectLazy = InjectLazy;
var Provide = function Provide(token) {
  this.token = token;
  this.isPromise = false;
};

exports.Provide = Provide;
var ProvidePromise = (function (Provide) {
  var ProvidePromise = function ProvidePromise(token) {
    this.token = token;
    this.isPromise = true;
  };

  _extends(ProvidePromise, Provide);

  return ProvidePromise;
})(Provide);

exports.ProvidePromise = ProvidePromise;
function annotate(fn, annotation) {
  if (fn.annotations === Object.getPrototypeOf(fn).annotations) {
    fn.annotations = [];
  }

  fn.annotations = fn.annotations || [];
  fn.annotations.push(annotation);
}


function hasAnnotation(fn, annotationClass) {
  if (!fn.annotations || fn.annotations.length === 0) {
    return false;
  }

  for (var _iterator = fn.annotations[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
    var annotation = _step.value;
    if (annotation instanceof annotationClass) {
      return true;
    }
  }

  return false;
}


function readAnnotations(fn) {
  var collectedAnnotations = {
    // Description of the provided value.
    provide: {
      token: null,
      isPromise: false
    },

    // List of parameter descriptions.
    // A parameter description is an object with properties:
    // - token (anything)
    // - isPromise (boolean)
    // - isLazy (boolean)
    params: []
  };

  if (fn.annotations && fn.annotations.length) {
    for (var _iterator2 = fn.annotations[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var annotation = _step2.value;
      if (annotation instanceof Inject) {
        annotation.tokens.forEach(function (token) {
          collectedAnnotations.params.push({
            token: token,
            isPromise: annotation.isPromise,
            isLazy: annotation.isLazy
          });
        });
      }

      if (annotation instanceof Provide) {
        collectedAnnotations.provide.token = annotation.token;
        collectedAnnotations.provide.isPromise = annotation.isPromise;
      }
    }
  }

  // Read annotations for individual parameters.
  if (fn.parameters) {
    fn.parameters.forEach(function (param, idx) {
      for (var _iterator3 = param[Symbol.iterator](), _step3; !(_step3 = _iterator3.next()).done;) {
        var paramAnnotation = _step3.value;
        // Type annotation.
        if (isFunction(paramAnnotation) && !collectedAnnotations.params[idx]) {
          collectedAnnotations.params[idx] = {
            token: paramAnnotation,
            isPromise: false,
            isLazy: false
          };
        } else if (paramAnnotation instanceof Inject) {
          collectedAnnotations.params[idx] = {
            token: paramAnnotation.tokens[0],
            isPromise: paramAnnotation.isPromise,
            isLazy: paramAnnotation.isLazy
          };
        }
      }
    });
  }

  return collectedAnnotations;
}
//# sourceMappingURL=maps/annotations.js.map
},{"./util":7}],3:[function(require,module,exports){
"use strict";

exports.Injector = require("./injector").Injector;
exports.annotate = require("./annotations").annotate;
exports.hasAnnotation = require("./annotations").hasAnnotation;
exports.readAnnotations = require("./annotations").readAnnotations;
exports.Inject = require("./annotations").Inject;
exports.InjectLazy = require("./annotations").InjectLazy;
exports.InjectPromise = require("./annotations").InjectPromise;
exports.Provide = require("./annotations").Provide;
exports.ProvidePromise = require("./annotations").ProvidePromise;
exports.SuperConstructor = require("./annotations").SuperConstructor;
exports.TransientScope = require("./annotations").TransientScope;
//# sourceMappingURL=maps/index.js.map
},{"./annotations":2,"./injector":4}],4:[function(require,module,exports){
"use strict";

var annotate = require('./annotations').annotate;
var readAnnotations = require('./annotations').readAnnotations;
var hasAnnotation = require('./annotations').hasAnnotation;
var ProvideAnnotation = require('./annotations').Provide;
var TransientScopeAnnotation = require('./annotations').TransientScope;
var isFunction = require('./util').isFunction;
var toString = require('./util').toString;
var profileInjector = require('./profiler').profileInjector;
var createProviderFromFnOrClass = require('./providers').createProviderFromFnOrClass;



function constructResolvingMessage(resolving, token) {
  // If a token is passed in, add it into the resolving array.
  // We need to check arguments.length because it can be null/undefined.
  if (arguments.length > 1) {
    resolving.push(token);
  }

  if (resolving.length > 1) {
    return " (" + resolving.map(toString).join(" -> ") + ")";
  }

  return "";
}


// Injector encapsulate a life scope.
// There is exactly one instance for given token in given injector.
//
// All the state is immutable, the only state changes is the cache. There is however no way to produce different instance under given token. In that sense it is immutable.
//
// Injector is responsible for:
// - resolving tokens into
//   - provider
//   - value (cache/calling provider)
// - dealing with isPromise
// - dealing with isLazy
// - loading different "providers" and modules
var Injector = (function () {
  var Injector = function Injector(modules, parentInjector, providers, scopes) {
    if (modules === undefined) modules = [];
    if (parentInjector === undefined) parentInjector = null;
    if (providers === undefined) providers = new Map();
    if (scopes === undefined) scopes = [];
    this._cache = new Map();
    this._providers = providers;
    this._parent = parentInjector;
    this._scopes = scopes;

    this._loadModules(modules);

    profileInjector(this, Injector);
  };

  Injector.prototype._collectProvidersWithAnnotation = function (annotationClass, collectedProviders) {
    this._providers.forEach(function (provider, token) {
      if (!collectedProviders.has(token) && hasAnnotation(provider.provider, annotationClass)) {
        collectedProviders.set(token, provider);
      }
    });

    if (this._parent) {
      this._parent._collectProvidersWithAnnotation(annotationClass, collectedProviders);
    }
  };

  Injector.prototype._loadModules = function (modules) {
    for (var _iterator = modules[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var module = _step.value;
      // A single provider (class or function).
      if (isFunction(module)) {
        this._loadFnOrClass(module);
        continue;
      }

      throw new Error("Invalid module!");
    }
  };

  Injector.prototype._loadFnOrClass = function (fnOrClass) {
    // TODO(vojta): should we expose provider.token?
    var annotations = readAnnotations(fnOrClass);
    var token = annotations.provide.token || fnOrClass;
    var provider = createProviderFromFnOrClass(fnOrClass, annotations);

    this._providers.set(token, provider);
  };

  Injector.prototype._hasProviderFor = function (token) {
    if (this._providers.has(token)) {
      return true;
    }

    if (this._parent) {
      return this._parent._hasProviderFor(token);
    }

    return false;
  };

  Injector.prototype._instantiateDefaultProvider = function (provider, token, resolving, wantPromise, wantLazy) {
    // In root injector, instantiate here.
    if (!this._parent) {
      this._providers.set(token, provider);
      return this.get(token, resolving, wantPromise, wantLazy);
    }

    for (var _iterator2 = this._scopes[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var ScopeClass = _step2.value;
      if (hasAnnotation(provider.provider, ScopeClass)) {
        this._providers.set(token, provider);
        return this.get(token, resolving, wantPromise, wantLazy);
      }
    }

    // Otherwise ask parent injector.
    return this._parent._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
  };

  Injector.prototype.get = function (token, resolving, wantPromise, wantLazy) {
    var _this = this;
    if (resolving === undefined) resolving = [];
    if (wantPromise === undefined) wantPromise = false;
    if (wantLazy === undefined) wantLazy = false;
    var resolvingMsg = "";
    var provider;
    var instance;
    var injector = this;

    if (token === null || token === undefined) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error("Invalid token \"" + token + "\" requested!" + resolvingMsg);
    }

    // Special case, return itself.
    if (token === Injector) {
      if (wantPromise) {
        return Promise.resolve(this);
      }

      return this;
    }

    // TODO(vojta): optimize - no child injector for locals?
    if (wantLazy) {
      return function createLazyInstance() {
        var lazyInjector = injector;

        if (arguments.length) {
          var locals = [];
          var args = arguments;

          for (var i = 0; i < args.length; i += 2) {
            locals.push((function (ii) {
              var fn = function createLocalInstance() {
                return args[ii + 1];
              };

              annotate(fn, new ProvideAnnotation(args[ii]));

              return fn;
            })(i));
          }

          lazyInjector = injector.createChild(locals);
        }

        return lazyInjector.get(token, resolving, wantPromise, false);
      };
    }

    // Check if there is a cached instance already.
    if (this._cache.has(token)) {
      instance = this._cache.get(token);
      provider = this._providers.get(token);

      if (provider.isPromise && !wantPromise) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
      }

      if (!provider.isPromise && wantPromise) {
        return Promise.resolve(instance);
      }

      return instance;
    }

    provider = this._providers.get(token);

    // No provider defined (overridden), use the default provider (token).
    if (!provider && isFunction(token) && !this._hasProviderFor(token)) {
      provider = createProviderFromFnOrClass(token, readAnnotations(token));
      return this._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    }

    if (!provider) {
      if (!this._parent) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error("No provider for " + toString(token) + "!" + resolvingMsg);
      }

      return this._parent.get(token, resolving, wantPromise, wantLazy);
    }

    if (resolving.indexOf(token) !== -1) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error("Cannot instantiate cyclic dependency!" + resolvingMsg);
    }

    resolving.push(token);

    // TODO(vojta): handle these cases:
    // 1/
    // - requested as promise (delayed)
    // - requested again as promise (before the previous gets resolved) -> cache the promise
    // 2/
    // - requested as promise (delayed)
    // - requested again sync (before the previous gets resolved)
    // -> error, but let it go inside to throw where exactly is the async provider
    var delayingInstantiation = wantPromise && provider.params.some(function (param) {
      return !param.isPromise;
    });
    var args = provider.params.map(function (param) {
      if (delayingInstantiation) {
        return _this.get(param.token, resolving, true, param.isLazy);
      }

      return _this.get(param.token, resolving, param.isPromise, param.isLazy);
    });

    // Delaying the instantiation - return a promise.
    if (delayingInstantiation) {
      var delayedResolving = resolving.slice(); // clone

      resolving.pop();

      // Once all dependencies (promises) are resolved, instantiate.
      return Promise.all(args).then(function (args) {
        try {
          instance = provider.create(args);
        } catch (e) {
          resolvingMsg = constructResolvingMessage(delayedResolving);
          var originalMsg = "ORIGINAL ERROR: " + e.message;
          e.message = "Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
          throw e;
        }

        if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
          injector._cache.set(token, instance);
        }

        // TODO(vojta): if a provider returns a promise (but is not declared as @ProvidePromise),
        // here the value will get unwrapped (because it is returned from a promise callback) and
        // the actual value will be injected. This is probably not desired behavior. Maybe we could
        // get rid off the @ProvidePromise and just check the returned value, whether it is
        // a promise or not.
        return instance;
      });
    }

    try {
      instance = provider.create(args);
    } catch (e) {
      resolvingMsg = constructResolvingMessage(resolving);
      var originalMsg = "ORIGINAL ERROR: " + e.message;
      e.message = "Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
      throw e;
    }

    if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
      this._cache.set(token, instance);
    }

    if (!wantPromise && provider.isPromise) {
      resolvingMsg = constructResolvingMessage(resolving);

      throw new Error("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
    }

    if (wantPromise && !provider.isPromise) {
      instance = Promise.resolve(instance);
    }

    resolving.pop();

    return instance;
  };

  Injector.prototype.getPromise = function (token) {
    return this.get(token, [], true);
  };

  Injector.prototype.createChild = function (modules, forceNewInstancesOf) {
    if (modules === undefined) modules = [];
    if (forceNewInstancesOf === undefined) forceNewInstancesOf = [];
    var forcedProviders = new Map();

    // Always force new instance of TransientScope.
    forceNewInstancesOf.push(TransientScopeAnnotation);

    for (var _iterator3 = forceNewInstancesOf[Symbol.iterator](), _step3; !(_step3 = _iterator3.next()).done;) {
      var annotation = _step3.value;
      this._collectProvidersWithAnnotation(annotation, forcedProviders);
    }

    return new Injector(modules, this, forcedProviders, forceNewInstancesOf);
  };

  return Injector;
})();

exports.Injector = Injector;
//# sourceMappingURL=maps/injector.js.map

},{"./annotations":2,"./profiler":5,"./providers":6,"./util":7}],5:[function(require,module,exports){
(function (process,global){
"use strict";

exports.profileInjector = profileInjector;
var toString = require('./util').toString;



var IS_DEBUG = false;
var _global = null;

if (typeof process === "object" && process.env) {
  // Node.js
  IS_DEBUG = !!process.env.DEBUG;
  _global = global;
} else if (typeof location === "object" && location.search) {
  // Browser
  IS_DEBUG = /di_debug/.test(location.search);
  _global = window;
}


var globalCounter = 0;
function getUniqueId() {
  return ++globalCounter;
}


function serializeToken(token, tokens) {
  if (!tokens.has(token)) {
    tokens.set(token, getUniqueId().toString());
  }

  return tokens.get(token);
}

function serializeProvider(provider, key, tokens) {
  return {
    id: serializeToken(key, tokens),
    name: toString(key),
    isPromise: provider.isPromise,
    dependencies: provider.params.map(function (param) {
      return {
        token: serializeToken(param.token, tokens),
        isPromise: param.isPromise,
        isLazy: param.isLazy
      };
    })
  };
}


function serializeInjector(injector, tokens, Injector) {
  var serializedInjector = {
    id: serializeToken(injector, tokens),
    parent_id: injector._parent ? serializeToken(injector._parent, tokens) : null,
    providers: {}
  };

  var injectorClassId = serializeToken(Injector, tokens);
  serializedInjector.providers[injectorClassId] = {
    id: injectorClassId,
    name: toString(Injector),
    isPromise: false,
    dependencies: []
  };

  injector._providers.forEach(function (provider, key) {
    var serializedProvider = serializeProvider(provider, key, tokens);
    serializedInjector.providers[serializedProvider.id] = serializedProvider;
  });

  return serializedInjector;
}


function profileInjector(injector, Injector) {
  if (!IS_DEBUG) {
    return;
  }

  if (!_global.__di_dump__) {
    _global.__di_dump__ = {
      injectors: [],
      tokens: new Map()
    };
  }

  _global.__di_dump__.injectors.push(serializeInjector(injector, _global.__di_dump__.tokens, Injector));
}
//# sourceMappingURL=maps/profiler.js.map
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":7,"_process":8}],6:[function(require,module,exports){
"use strict";

exports.createProviderFromFnOrClass = createProviderFromFnOrClass;
var SuperConstructorAnnotation = require('./annotations').SuperConstructor;
var readAnnotations = require('./annotations').readAnnotations;
var isClass = require('./util').isClass;
var isFunction = require('./util').isFunction;
var isObject = require('./util').isObject;
var toString = require('./util').toString;



// Provider is responsible for creating instances.
//
// responsibilities:
// - create instances
//
// communication:
// - exposes `create()` which creates an instance of something
// - exposes `params` (information about which arguments it requires to be passed into `create()`)
//
// Injector reads `provider.params` first, create these dependencies (however it wants),
// then calls `provider.create(args)`, passing in these arguments.


var EmptyFunction = Object.getPrototypeOf(Function);


// ClassProvider knows how to instantiate classes.
//
// If a class inherits (has parent constructors), this provider normalizes all the dependencies
// into a single flat array first, so that the injector does not need to worry about inheritance.
//
// - all the state is immutable (constructed)
//
// TODO(vojta): super constructor - should be only allowed during the constructor call?
var ClassProvider = (function () {
  var ClassProvider = function ClassProvider(clazz, params, isPromise) {
    // TODO(vojta): can we hide this.provider? (only used for hasAnnotation(provider.provider))
    this.provider = clazz;
    this.isPromise = isPromise;

    this.params = [];
    this._constructors = [];

    this._flattenParams(clazz, params);
    this._constructors.unshift([clazz, 0, this.params.length - 1]);
  };

  ClassProvider.prototype._flattenParams = function (constructor, params) {
    var SuperConstructor;
    var constructorInfo;

    for (var _iterator = params[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var param = _step.value;
      if (param.token === SuperConstructorAnnotation) {
        SuperConstructor = Object.getPrototypeOf(constructor);

        if (SuperConstructor === EmptyFunction) {
          throw new Error("" + toString(constructor) + " does not have a parent constructor. Only classes with a parent can ask for SuperConstructor!");
        }

        constructorInfo = [SuperConstructor, this.params.length];
        this._constructors.push(constructorInfo);
        this._flattenParams(SuperConstructor, readAnnotations(SuperConstructor).params);
        constructorInfo.push(this.params.length - 1);
      } else {
        this.params.push(param);
      }
    }
  };

  ClassProvider.prototype._createConstructor = function (currentConstructorIdx, context, allArguments) {
    var constructorInfo = this._constructors[currentConstructorIdx];
    var nextConstructorInfo = this._constructors[currentConstructorIdx + 1];
    var argsForCurrentConstructor;

    if (nextConstructorInfo) {
      argsForCurrentConstructor = allArguments.slice(constructorInfo[1], nextConstructorInfo[1]).concat([this._createConstructor(currentConstructorIdx + 1, context, allArguments)]).concat(allArguments.slice(nextConstructorInfo[2] + 1, constructorInfo[2] + 1));
    } else {
      argsForCurrentConstructor = allArguments.slice(constructorInfo[1], constructorInfo[2] + 1);
    }

    return function InjectedAndBoundSuperConstructor() {
      // TODO(vojta): throw if arguments given
      return constructorInfo[0].apply(context, argsForCurrentConstructor);
    };
  };

  ClassProvider.prototype.create = function (args) {
    var context = Object.create(this.provider.prototype);
    var constructor = this._createConstructor(0, context, args);
    var returnedValue = constructor();

    if (isFunction(returnedValue) || isObject(returnedValue)) {
      return returnedValue;
    }

    return context;
  };

  return ClassProvider;
})();




// FactoryProvider knows how to create instance from a factory function.
// - all the state is immutable
var FactoryProvider = (function () {
  var FactoryProvider = function FactoryProvider(factoryFunction, params, isPromise) {
    this.provider = factoryFunction;
    this.params = params;
    this.isPromise = isPromise;

    for (var _iterator2 = params[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var param = _step2.value;
      if (param.token === SuperConstructorAnnotation) {
        throw new Error("" + toString(factoryFunction) + " is not a class. Only classes with a parent can ask for SuperConstructor!");
      }
    }
  };

  FactoryProvider.prototype.create = function (args) {
    return this.provider.apply(undefined, args);
  };

  return FactoryProvider;
})();

function createProviderFromFnOrClass(fnOrClass, annotations) {
  if (isClass(fnOrClass)) {
    return new ClassProvider(fnOrClass, annotations.params, annotations.provide.isPromise);
  }

  return new FactoryProvider(fnOrClass, annotations.params, annotations.provide.isPromise);
}
//# sourceMappingURL=maps/providers.js.map
},{"./annotations":2,"./util":7}],7:[function(require,module,exports){
"use strict";

// A bunch of helper functions.


function isUpperCase(char) {
  return char.toUpperCase() === char;
}


function isClass(clsOrFunction) {
  if (clsOrFunction.name) {
    return isUpperCase(clsOrFunction.name.charAt(0));
  }

  return Object.keys(clsOrFunction.prototype).length > 0;
}


function isFunction(value) {
  return typeof value === "function";
}


function isObject(value) {
  return typeof value === "object";
}


function toString(token) {
  if (typeof token === "string") {
    return token;
  }

  if (token === undefined || token === null) {
    return "" + token;
  }

  if (token.name) {
    return token.name;
  }

  return token.toString();
}


exports.isUpperCase = isUpperCase;
exports.isClass = isClass;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.toString = toString;
//# sourceMappingURL=maps/util.js.map
},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],9:[function(require,module,exports){
(function (process){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var setImmediate;

    function addFromSetImmediateArguments(args) {
        tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
        return nextHandle++;
    }

    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
        var args = [].slice.call(arguments, 1);
        return function() {
            if (typeof handler === "function") {
                handler.apply(undefined, args);
            } else {
                (new Function("" + handler))();
            }
        };
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    task();
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function installNextTickImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            process.nextTick(partiallyApplied(runIfPresent, handle));
            return handle;
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            global.postMessage(messagePrefix + handle, "*");
            return handle;
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            channel.port2.postMessage(handle);
            return handle;
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
            return handle;
        };
    }

    function installSetTimeoutImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
            return handle;
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

}).call(this,require('_process'))
},{"_process":8}],10:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var assert = chai.assert;
exports["default"] = function () {
  describe("c0()(args...)", function () {
    it("should not pass the thunk as an arguments", c0(regeneratorRuntime.mark(function _callee() {
      var _arguments = arguments;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (true) switch (_context.prev = _context.next) {
          case 0:
            assert.equal(_arguments.length, 0);
          case 1:
          case "end": return _context.stop();
        }
      }, _callee, this);
    })));

    it("should not pass error for nil first argument", function (done) {
      c0(regeneratorRuntime.mark(function _callee2(i) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (true) switch (_context2.prev = _context2.next) {
            case 0:
              assert.equal(i, 0);
            case 1:
            case "end": return _context2.stop();
          }
        }, _callee2, this);
      }))(0, done);
    });
  });
};

},{"c0":1}],11:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var expect = chai.expect;


function read(args) {
  return c0(regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (true) switch (_context.prev = _context.next) {
        case 0: return _context.abrupt("return", args);
        case 1:
        case "end": return _context.stop();
      }
    }, _callee, this);
  }));
}

exports["default"] = function () {
  describe("c0(* -> yield [])", function () {
    it("should aggregate several thunks", function (done) {
      c0(regeneratorRuntime.mark(function _callee2() {
        var a, b, c, res;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (true) switch (_context2.prev = _context2.next) {
            case 0: a = read("00");
              b = read("01");
              c = read("02");
              _context2.next = 5;
              return [a, b, c];
            case 5: res = _context2.sent;


              expect(res).to.have.length(3);
              expect(res[0]).to.equal("00");
              expect(res[1]).to.equal("01");
              expect(res[2]).to.equal("02");

            case 10:
            case "end": return _context2.stop();
          }
        }, _callee2, this);
      }))(done);
    });

    it("should noop with no args", function (done) {
      c0(regeneratorRuntime.mark(function _callee3() {
        var res;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (true) switch (_context3.prev = _context3.next) {
            case 0: _context3.next = 2;
              return [];
            case 2: res = _context3.sent;
              expect(res).to.have.length(0);
            case 4:
            case "end": return _context3.stop();
          }
        }, _callee3, this);
      }))(done);
    });
  });
};

},{"c0":1}],12:[function(require,module,exports){
"use strict";

var work = regeneratorRuntime.mark(function work() {
  return regeneratorRuntime.wrap(function work$(_context) {
    while (true) switch (_context.prev = _context.next) {
      case 0: _context.next = 2;
        return setImmediate;
      case 2: return _context.abrupt("return", "yay");
      case 3:
      case "end": return _context.stop();
    }
  }, work, this);
});

var c0 = require('c0');

var assert = chai.assert;
var expect = chai.expect;
exports["default"] = function () {
  describe("c0(fn)", function () {
    describe("with a generator function", function () {
      it("should wrap with c0()", function (done) {
        c0(regeneratorRuntime.mark(function _callee() {
          var a, b, c, res;
          return regeneratorRuntime.wrap(function _callee$(_context2) {
            while (true) switch (_context2.prev = _context2.next) {
              case 0: _context2.next = 2;
                return work;
              case 2: a = _context2.sent;
                _context2.next = 5;
                return work;
              case 5: b = _context2.sent;
                _context2.next = 8;
                return work;
              case 8: c = _context2.sent;


                assert("yay" === a);
                assert("yay" === b);
                assert("yay" === c);

                _context2.next = 14;
                return [work, work, work];
              case 14: res = _context2.sent;
                expect(res).to.deep.equal(["yay", "yay", "yay"]);
              case 16:
              case "end": return _context2.stop();
            }
          }, _callee, this);
        }))(done);
      });

      it("should catch errors", function (done) {
        c0(regeneratorRuntime.mark(function _callee3() {
          return regeneratorRuntime.wrap(function _callee3$(_context4) {
            while (true) switch (_context4.prev = _context4.next) {
              case 0: _context4.next = 2;
                return regeneratorRuntime.mark(function _callee2() {
                  return regeneratorRuntime.wrap(function _callee2$(_context3) {
                    while (true) switch (_context3.prev = _context3.next) {
                      case 0: throw new Error("boom");
                      case 1:
                      case "end": return _context3.stop();
                    }
                  }, _callee2, this);
                });
              case 2:
              case "end": return _context4.stop();
            }
          }, _callee3, this);
        }))(function (err) {
          assert(err);
          assert(err.message === "boom");
          done();
        });
      });
    });
  });
};

},{"c0":1}],13:[function(require,module,exports){
"use strict";

var moreWork = regeneratorRuntime.mark(function moreWork(calls) {
  return regeneratorRuntime.wrap(function moreWork$(_context) {
    while (true) switch (_context.prev = _context.next) {
      case 0:
        calls.push("three");
        _context.next = 3;
        return setImmediate;
      case 3:
        calls.push("four");
      case 4:
      case "end": return _context.stop();
    }
  }, moreWork, this);
});

var work = regeneratorRuntime.mark(function work() {
  var calls;
  return regeneratorRuntime.wrap(function work$(_context2) {
    while (true) switch (_context2.prev = _context2.next) {
      case 0: calls = [];
        calls.push("one");
        _context2.next = 4;
        return setImmediate;
      case 4:
        calls.push("two");
        _context2.next = 7;
        return moreWork(calls);
      case 7:
        calls.push("five");
        return _context2.abrupt("return", calls);
      case 9:
      case "end": return _context2.stop();
    }
  }, work, this);
});

var c0 = require('c0');

var assert = chai.assert;
var expect = chai.expect;
exports["default"] = function () {
  describe("c0(fn)", function () {
    describe("with a generator", function () {
      it("should wrap with c0()", function (done) {
        c0(regeneratorRuntime.mark(function _callee() {
          var calls, a, b, c;
          return regeneratorRuntime.wrap(function _callee$(_context3) {
            while (true) switch (_context3.prev = _context3.next) {
              case 0: _context3.next = 2;
                return work();
              case 2: calls = _context3.sent;
                expect(calls).to.deep.equal(["one", "two", "three", "four", "five"]);

                a = work();
                b = work();
                c = work();
                _context3.next = 9;
                return [a, b, c];
              case 9: calls = _context3.sent;
                expect(calls).to.deep.equal([["one", "two", "three", "four", "five"], ["one", "two", "three", "four", "five"], ["one", "two", "three", "four", "five"]]);

              case 11:
              case "end": return _context3.stop();
            }
          }, _callee, this);
        }))(done);
      });

      it("should catch errors", function (done) {
        c0(regeneratorRuntime.mark(function _callee3() {
          return regeneratorRuntime.wrap(function _callee3$(_context5) {
            while (true) switch (_context5.prev = _context5.next) {
              case 0: _context5.next = 2;
                return (regeneratorRuntime.mark(function _callee2() {
                  return regeneratorRuntime.wrap(function _callee2$(_context4) {
                    while (true) switch (_context4.prev = _context4.next) {
                      case 0: throw new Error("boom");
                      case 1:
                      case "end": return _context4.stop();
                    }
                  }, _callee2, this);
                })());
              case 2:
              case "end": return _context5.stop();
            }
          }, _callee3, this);
        }))(function (err) {
          assert(err);
          assert(err.message === "boom");
          done();
        });
      });
    });
  });
};

},{"c0":1}],14:[function(require,module,exports){
"use strict";

var argSpecs = require('./arguments')["default"];
var arraySpecs = require('./arrays')["default"];
var genFnSpecs = require('./generator-functions')["default"];
var genSpecs = require('./generators')["default"];
var objSpecs = require('./objects')["default"];
var promSpecs = require('./promises')["default"];
var receSpecs = require('./receiver')["default"];
var recuSpecs = require('./recursion')["default"];
var thunSpecs = require('./thunks')["default"];


describe("c0 generator utillity", function () {
  argSpecs();
  arraySpecs();
  genFnSpecs();
  genSpecs();
  objSpecs();
  promSpecs();
  receSpecs();
  recuSpecs();
  thunSpecs();
});

},{"./arguments":10,"./arrays":11,"./generator-functions":12,"./generators":13,"./objects":15,"./promises":16,"./receiver":17,"./recursion":18,"./thunks":19}],15:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var expect = chai.expect;


function read(args) {
  return c0(regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (true) switch (_context.prev = _context.next) {
        case 0: return _context.abrupt("return", args);
        case 1:
        case "end": return _context.stop();
      }
    }, _callee, this);
  }));
}

function Pet(name) {
  this.name = name;
  this.something = function () {};
}

exports["default"] = function () {
  describe("c0(* -> yield {})", function () {
    it("should aggregate several thunks", function (done) {
      c0(regeneratorRuntime.mark(function _callee2() {
        var a, b, c, res;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (true) switch (_context2.prev = _context2.next) {
            case 0: a = read("00");
              b = read("01");
              c = read("02");
              _context2.next = 5;
              return {
                a: a,
                b: b,
                c: c
              };
            case 5: res = _context2.sent;


              expect(Object.keys(res)).to.have.length(3);
              expect(res.a).to.equal("00");
              expect(res.b).to.equal("01");
              expect(res.c).to.equal("02");
            case 10:
            case "end": return _context2.stop();
          }
        }, _callee2, this);
      }))(done);
    });

    it("should noop with no args", function (done) {
      c0(regeneratorRuntime.mark(function _callee3() {
        var res;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (true) switch (_context3.prev = _context3.next) {
            case 0: _context3.next = 2;
              return {};
            case 2: res = _context3.sent;
              expect(Object.keys(res)).to.have.length(0);
            case 4:
            case "end": return _context3.stop();
          }
        }, _callee3, this);
      }))(done);
    });

    it("should ignore non-thunkable properties", function (done) {
      c0(regeneratorRuntime.mark(function _callee4() {
        var foo, res;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (true) switch (_context4.prev = _context4.next) {
            case 0: foo = {
                name: { first: "tobi" },
                age: 2,
                address: read("00"),
                tobi: new Pet("tobi"),
                now: new Date()
              };
              _context4.next = 3;
              return foo;
            case 3: res = _context4.sent;


              expect(res.name).to.deep.equal({ first: "tobi" });
              expect(res.age).to.equal(2);
              expect(res.tobi.name).to.equal("tobi");
              expect(res.now).to.deep.equal(foo.now);
              expect(res.address).to.include("00");
            case 9:
            case "end": return _context4.stop();
          }
        }, _callee4, this);
      }))(done);
    });

    it("should preserve key order", function (done) {
      function timedThunk(time) {
        return function (cb) {
          setTimeout(cb.bind(null, null, 0), time);
        };
      }

      c0(regeneratorRuntime.mark(function _callee5() {
        var before, after, orderBefore, orderAfter;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (true) switch (_context5.prev = _context5.next) {
            case 0: before = {
                sun: timedThunk(30),
                rain: timedThunk(20),
                moon: timedThunk(10) };
              _context5.next = 3;
              return before;
            case 3: after = _context5.sent;
              orderBefore = Object.keys(before).join(",");
              orderAfter = Object.keys(after).join(",");


              expect(orderBefore).to.equal(orderAfter);
            case 7:
            case "end": return _context5.stop();
          }
        }, _callee5, this);
      }))(done);
    });
  });
};

},{"c0":1}],16:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var assert = chai.assert;
var expect = chai.expect;


function getPromise(val, err) {
  return new Promise(function (resolve, reject) {
    if (err) {
      reject(err);
    } else {
      resolve(val);
    }
  });
}

exports["default"] = function () {
  describe("c0(fn)", function () {
    describe("with one promise yield", function () {
      it("should work", function (done) {
        c0(regeneratorRuntime.mark(function _callee() {
          var a;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (true) switch (_context.prev = _context.next) {
              case 0: _context.next = 2;
                return getPromise(1);
              case 2: a = _context.sent;
                expect(a).to.equal(1);
              case 4:
              case "end": return _context.stop();
            }
          }, _callee, this);
        }))(done);
      });
    });

    describe("with several promise yields", function () {
      it("should work", function (done) {
        c0(regeneratorRuntime.mark(function _callee2() {
          var a, b, c;
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (true) switch (_context2.prev = _context2.next) {
              case 0: _context2.next = 2;
                return getPromise(1);
              case 2: a = _context2.sent;
                _context2.next = 5;
                return getPromise(2);
              case 5: b = _context2.sent;
                _context2.next = 8;
                return getPromise(3);
              case 8: c = _context2.sent;


                expect([a, b, c]).to.deep.equal([1, 2, 3]);
              case 10:
              case "end": return _context2.stop();
            }
          }, _callee2, this);
        }))(done);
      });
    });

    describe("when a promise is rejected", function () {
      it("should throw and resume", function (done) {
        var error;

        c0(regeneratorRuntime.mark(function _callee3() {
          var ret;
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (true) switch (_context3.prev = _context3.next) {
              case 0: _context3.prev = 0;
                _context3.next = 3;
                return getPromise(1, new Error("boom"));
              case 3: _context3.next = 8;
                break;
              case 5: _context3.prev = 5;
                _context3.t36 = _context3["catch"](0);
                error = _context3.t36;
              case 8:

                assert("boom" === error.message);
                _context3.next = 11;
                return getPromise(1);
              case 11: ret = _context3.sent;
                assert(1 === ret);
              case 13:
              case "end": return _context3.stop();
            }
          }, _callee3, this, [[0, 5]]);
        }))(done);
      });
    });
  });
};

},{"c0":1}],17:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var assert = chai.assert;


var ctx = {
  foo: "bar"
};

exports["default"] = function () {
  describe("c0(receiver).call(ctx)", function () {
    it("should set immediate gen receiver", function (done) {
      c0(regeneratorRuntime.mark(function _callee() {
        var _this = this;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (true) switch (_context.prev = _context.next) {
            case 0:
              assert(ctx === _this);
            case 1:
            case "end": return _context.stop();
          }
        }, _callee, this);
      })).call(ctx, done);
    });

    it("should set delegate generator receiver", function (done) {
      var bar = regeneratorRuntime.mark(function bar() {
        var _this2 = this;
        return regeneratorRuntime.wrap(function bar$(_context2) {
          while (true) switch (_context2.prev = _context2.next) {
            case 0:
              assert(ctx === _this2);
            case 1:
            case "end": return _context2.stop();
          }
        }, bar, this);
      });

      var foo = regeneratorRuntime.mark(function foo() {
        var _this3 = this;
        return regeneratorRuntime.wrap(function foo$(_context3) {
          while (true) switch (_context3.prev = _context3.next) {
            case 0:
              assert(ctx === _this3);
              _context3.next = 3;
              return bar;
            case 3:
            case "end": return _context3.stop();
          }
        }, foo, this);
      });

      c0(regeneratorRuntime.mark(function _callee2() {
        var _this4 = this;
        return regeneratorRuntime.wrap(function _callee2$(_context4) {
          while (true) switch (_context4.prev = _context4.next) {
            case 0:
              assert(ctx === _this4);
              _context4.next = 3;
              return foo;
            case 3:
            case "end": return _context4.stop();
          }
        }, _callee2, this);
      })).call(ctx, done);
    });

    it("should set function receiver", function (done) {
      function foo(done) {
        assert(this === ctx);
        done();
      }

      c0(regeneratorRuntime.mark(function _callee3() {
        var _this5 = this;
        return regeneratorRuntime.wrap(function _callee3$(_context5) {
          while (true) switch (_context5.prev = _context5.next) {
            case 0:
              assert(ctx === _this5);
              _context5.next = 3;
              return foo;
            case 3:
            case "end": return _context5.stop();
          }
        }, _callee3, this);
      })).call(ctx, done);
    });

    it("should set join delegate generator receiver", function (done) {
      var baz = regeneratorRuntime.mark(function baz() {
        var _this6 = this;
        return regeneratorRuntime.wrap(function baz$(_context6) {
          while (true) switch (_context6.prev = _context6.next) {
            case 0:
              assert(ctx === _this6);
            case 1:
            case "end": return _context6.stop();
          }
        }, baz, this);
      });

      var bar = regeneratorRuntime.mark(function bar() {
        var _this7 = this;
        return regeneratorRuntime.wrap(function bar$(_context7) {
          while (true) switch (_context7.prev = _context7.next) {
            case 0:
              assert(ctx === _this7);
            case 1:
            case "end": return _context7.stop();
          }
        }, bar, this);
      });

      var foo = regeneratorRuntime.mark(function foo() {
        var _this8 = this;
        return regeneratorRuntime.wrap(function foo$(_context8) {
          while (true) switch (_context8.prev = _context8.next) {
            case 0:
              assert(ctx === _this8);
            case 1:
            case "end": return _context8.stop();
          }
        }, foo, this);
      });

      c0(regeneratorRuntime.mark(function _callee4() {
        var _this9 = this;
        return regeneratorRuntime.wrap(function _callee4$(_context9) {
          while (true) switch (_context9.prev = _context9.next) {
            case 0:
              assert(ctx === _this9);
              _context9.next = 3;
              return [foo, bar, baz];
            case 3:
            case "end": return _context9.stop();
          }
        }, _callee4, this);
      })).call(ctx, done);
    });

    it("should set join function receiver", function (done) {
      function baz(done) {
        assert(ctx === this);
        done();
      }

      function bar(done) {
        assert(ctx === this);
        done();
      }

      function foo(done) {
        assert(ctx === this);
        done();
      }

      c0(regeneratorRuntime.mark(function _callee5() {
        var _this10 = this;
        return regeneratorRuntime.wrap(function _callee5$(_context10) {
          while (true) switch (_context10.prev = _context10.next) {
            case 0:
              assert(ctx === _this10);
              _context10.next = 3;
              return [foo, bar, baz];
            case 3:
            case "end": return _context10.stop();
          }
        }, _callee5, this);
      })).call(ctx, done);
    });
  });

  describe("c0(receiver)(args...)", function () {
    it("should pass arguments to the receiver", function (done) {
      c0(regeneratorRuntime.mark(function _callee6(a, b, c) {
        return regeneratorRuntime.wrap(function _callee6$(_context11) {
          while (true) switch (_context11.prev = _context11.next) {
            case 0:
              assert(a === 1);
              assert(b === 2);
              assert(c === 3);
            case 3:
            case "end": return _context11.stop();
          }
        }, _callee6, this);
      }))(1, 2, 3, done);
    });

    it("should not pass the callback to the receiver", function (done) {
      c0(regeneratorRuntime.mark(function _callee7(a, b, c) {
        var _arguments = arguments;
        return regeneratorRuntime.wrap(function _callee7$(_context12) {
          while (true) switch (_context12.prev = _context12.next) {
            case 0:
              assert(_arguments.length === 3);
            case 1:
            case "end": return _context12.stop();
          }
        }, _callee7, this);
      }))(1, 2, 3, done);
    });

    it("should work when less arguments are passed than expected", function (done) {
      c0(regeneratorRuntime.mark(function _callee8(a, b, c) {
        var _arguments2 = arguments;
        return regeneratorRuntime.wrap(function _callee8$(_context13) {
          while (true) switch (_context13.prev = _context13.next) {
            case 0:
              assert(a === 1);
              assert(_arguments2.length === 1);
            case 2:
            case "end": return _context13.stop();
          }
        }, _callee8, this);
      }))(1, done);
    });

    it("should work without a callback", function () {
      c0(regeneratorRuntime.mark(function _callee9(a, b, c) {
        var _arguments3 = arguments;
        return regeneratorRuntime.wrap(function _callee9$(_context14) {
          while (true) switch (_context14.prev = _context14.next) {
            case 0:
              assert(a === 1);
              assert(_arguments3.length === 1);
            case 2:
            case "end": return _context14.stop();
          }
        }, _callee9, this);
      }))(1);
    });
  });
};

},{"c0":1}],18:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var expect = chai.expect;


function read(args) {
  return c0(regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (true) switch (_context.prev = _context.next) {
        case 0: return _context.abrupt("return", args);
        case 1:
        case "end": return _context.stop();
      }
    }, _callee, this);
  }));
}

exports["default"] = function () {
  describe("c0() recursion", function () {
    it("should aggregate arrays within arrays", function (done) {
      c0(regeneratorRuntime.mark(function _callee2() {
        var a, b, c, res;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (true) switch (_context2.prev = _context2.next) {
            case 0: a = read("00");
              b = read("01");
              c = read("02");
              _context2.next = 5;
              return [a, [b, c]];
            case 5: res = _context2.sent;
              expect(res).to.have.length(2);
              expect(res[0]).to.equal("00");
              expect(res[1]).to.have.length(2);
              expect(res[1][0]).to.equal("01");
              expect(res[1][1]).to.equal("02");
            case 11:
            case "end": return _context2.stop();
          }
        }, _callee2, this);
      }))(done);
    });

    it("should aggregate objects within objects", function (done) {
      c0(regeneratorRuntime.mark(function _callee3() {
        var a, b, c, res;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (true) switch (_context3.prev = _context3.next) {
            case 0: a = read("00");
              b = read("01");
              c = read("02");
              _context3.next = 5;
              return {
                0: a,
                1: {
                  0: b,
                  1: c
                }
              };
            case 5: res = _context3.sent;


              expect(res[0]).to.equal("00");
              expect(res[1][0]).to.equal("01");
              expect(res[1][1]).to.equal("02");
            case 9:
            case "end": return _context3.stop();
          }
        }, _callee3, this);
      }))(done);
    });
  });
};

},{"c0":1}],19:[function(require,module,exports){
"use strict";

var c0 = require('c0');

var assert = chai.assert;
var expect = chai.expect;


function get(val, err, error) {
  return function (done) {
    if (error) {
      throw error;
    }
    setImmediate(function () {
      done(err, val);
    });
  };
}

exports["default"] = function () {
  describe("c0(fn)", function () {
    describe("with no yields", function () {
      it("should work", function (done) {
        c0(regeneratorRuntime.mark(function _callee() {
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (true) switch (_context.prev = _context.next) {
              case 0:
              case "end": return _context.stop();
            }
          }, _callee, this);
        }))(done);
      });
    });

    describe("with one yield", function () {
      it("should work", function (done) {
        c0(regeneratorRuntime.mark(function _callee2() {
          var a;
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (true) switch (_context2.prev = _context2.next) {
              case 0: _context2.next = 2;
                return get(1);
              case 2: a = _context2.sent;
                expect(a).to.equal(1);
              case 4:
              case "end": return _context2.stop();
            }
          }, _callee2, this);
        }))(done);
      });
    });

    describe("with several yields", function () {
      it("should work", function (done) {
        c0(regeneratorRuntime.mark(function _callee3() {
          var a, b, c;
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (true) switch (_context3.prev = _context3.next) {
              case 0: _context3.next = 2;
                return get(1);
              case 2: a = _context3.sent;
                _context3.next = 5;
                return get(2);
              case 5: b = _context3.sent;
                _context3.next = 8;
                return get(3);
              case 8: c = _context3.sent;


                expect([a, b, c]).to.deep.equal([1, 2, 3]);
              case 10:
              case "end": return _context3.stop();
            }
          }, _callee3, this);
        }))(done);
      });
    });

    describe("with many arguments", function () {
      it("should return an array", function (done) {
        function exec(cmd) {
          return function (done) {
            done(null, "stdout", "stderr");
          };
        }

        c0(regeneratorRuntime.mark(function _callee4() {
          var out;
          return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (true) switch (_context4.prev = _context4.next) {
              case 0: _context4.next = 2;
                return exec("something");
              case 2: out = _context4.sent;
                expect(out).to.deep.equal(["stdout", "stderr"]);
              case 4:
              case "end": return _context4.stop();
            }
          }, _callee4, this);
        }))(done);
      });
    });

    describe("when the function throws", function () {
      it("should be caught", function (done) {
        c0(regeneratorRuntime.mark(function _callee5() {
          return regeneratorRuntime.wrap(function _callee5$(_context5) {
            while (true) switch (_context5.prev = _context5.next) {
              case 0: _context5.prev = 0;
                _context5.next = 3;
                return get(1, null, new Error("boom"));
              case 3: _context5.next = 8;
                break;
              case 5: _context5.prev = 5;
                _context5.t37 = _context5["catch"](0);
                expect(_context5.t37.message).to.equal("boom");
              case 8:
              case "end": return _context5.stop();
            }
          }, _callee5, this, [[0, 5]]);
        }))(done);
      });
    });

    describe("when an error is passed then thrown", function () {
      it("should only catch the first error only", function (done) {
        c0(regeneratorRuntime.mark(function _callee6() {
          return regeneratorRuntime.wrap(function _callee6$(_context6) {
            while (true) switch (_context6.prev = _context6.next) {
              case 0: _context6.next = 2;
                return function (done) {
                  done(new Error("first"));
                  throw new Error("second");
                };
              case 2:
              case "end": return _context6.stop();
            }
          }, _callee6, this);
        }))(function (err) {
          expect(err.message).to.equal("first");
          done();
        });
      });
    });

    describe("when an error is passed", function () {
      it("should throw and resume", function (done) {
        var error;

        c0(regeneratorRuntime.mark(function _callee7() {
          var ret;
          return regeneratorRuntime.wrap(function _callee7$(_context7) {
            while (true) switch (_context7.prev = _context7.next) {
              case 0: _context7.prev = 0;
                _context7.next = 3;
                return get(1, new Error("boom"));
              case 3: _context7.next = 8;
                break;
              case 5: _context7.prev = 5;
                _context7.t38 = _context7["catch"](0);
                error = _context7.t38;
              case 8:

                assert("boom" === error.message);
                _context7.next = 11;
                return get(1);
              case 11: ret = _context7.sent;
                assert(1 === ret);
              case 13:
              case "end": return _context7.stop();
            }
          }, _callee7, this, [[0, 5]]);
        }))(done);
      });
    });

    describe("with nested c0()s", function () {
      it("should work", function (done) {
        var hit = [];

        c0(regeneratorRuntime.mark(function _callee11() {
          var a, b, c;
          return regeneratorRuntime.wrap(function _callee11$(_context11) {
            while (true) switch (_context11.prev = _context11.next) {
              case 0: _context11.next = 2;
                return get(1);
              case 2: a = _context11.sent;
                _context11.next = 5;
                return get(2);
              case 5: b = _context11.sent;
                _context11.next = 8;
                return get(3);
              case 8: c = _context11.sent;
                hit.push("one");

                expect([a, b, c]).to.deep.equal([1, 2, 3]);

                _context11.next = 13;
                return c0(regeneratorRuntime.mark(function _callee9() {
                  var a, b, c;
                  return regeneratorRuntime.wrap(function _callee9$(_context9) {
                    while (true) switch (_context9.prev = _context9.next) {
                      case 0:
                        hit.push("two");
                        _context9.next = 3;
                        return get(1);
                      case 3: a = _context9.sent;
                        _context9.next = 6;
                        return get(2);
                      case 6: b = _context9.sent;
                        _context9.next = 9;
                        return get(3);
                      case 9: c = _context9.sent;


                        expect([a, b, c]).to.deep.equal([1, 2, 3]);

                        _context9.next = 13;
                        return c0(regeneratorRuntime.mark(function _callee8() {
                          var a, b, c;
                          return regeneratorRuntime.wrap(function _callee8$(_context8) {
                            while (true) switch (_context8.prev = _context8.next) {
                              case 0:
                                hit.push("three");
                                _context8.next = 3;
                                return get(1);
                              case 3: a = _context8.sent;
                                _context8.next = 6;
                                return get(2);
                              case 6: b = _context8.sent;
                                _context8.next = 9;
                                return get(3);
                              case 9: c = _context8.sent;


                                expect([a, b, c]).to.deep.equal([1, 2, 3]);
                              case 11:
                              case "end": return _context8.stop();
                            }
                          }, _callee8, this);
                        }));
                      case 13:
                      case "end": return _context9.stop();
                    }
                  }, _callee9, this);
                }));
              case 13: _context11.next = 15;
                return c0(regeneratorRuntime.mark(function _callee10() {
                  var a, b, c;
                  return regeneratorRuntime.wrap(function _callee10$(_context10) {
                    while (true) switch (_context10.prev = _context10.next) {
                      case 0:
                        hit.push("four");
                        _context10.next = 3;
                        return get(1);
                      case 3: a = _context10.sent;
                        _context10.next = 6;
                        return get(2);
                      case 6: b = _context10.sent;
                        _context10.next = 9;
                        return get(3);
                      case 9: c = _context10.sent;


                        expect([a, b, c]).to.deep.equal([1, 2, 3]);
                      case 11:
                      case "end": return _context10.stop();
                    }
                  }, _callee10, this);
                }));
              case 15:

                expect(hit).to.deep.equal(["one", "two", "three", "four"]);
              case 16:
              case "end": return _context11.stop();
            }
          }, _callee11, this);
        }))(done);
      });
    });

    describe("return values", function () {
      describe("with a callback", function () {
        it("should be passed", function (done) {
          var fn = c0(regeneratorRuntime.mark(function _callee12() {
            return regeneratorRuntime.wrap(function _callee12$(_context12) {
              while (true) switch (_context12.prev = _context12.next) {
                case 0: _context12.next = 2;
                  return get(1);
                case 2: _context12.t39 = _context12.sent;
                  _context12.next = 5;
                  return get(2);
                case 5: _context12.t40 = _context12.sent;
                  _context12.next = 8;
                  return get(3);
                case 8: _context12.t41 = _context12.sent;
                  return _context12.abrupt("return", [_context12.t39, _context12.t40, _context12.t41]);
                case 10:
                case "end": return _context12.stop();
              }
            }, _callee12, this);
          }));

          fn(function (err, res) {
            if (err) {
              return done(err);
            }
            expect(res).to.deep.equal([1, 2, 3]);
            done();
          });
        });
      });

      describe("when nested", function () {
        it("should return the value", function (done) {
          var fn = c0(regeneratorRuntime.mark(function _callee14() {
            var other;
            return regeneratorRuntime.wrap(function _callee14$(_context14) {
              while (true) switch (_context14.prev = _context14.next) {
                case 0: _context14.next = 2;
                  return c0(regeneratorRuntime.mark(function _callee13() {
                    return regeneratorRuntime.wrap(function _callee13$(_context13) {
                      while (true) switch (_context13.prev = _context13.next) {
                        case 0: _context13.next = 2;
                          return get(4);
                        case 2: _context13.t42 = _context13.sent;
                          _context13.next = 5;
                          return get(5);
                        case 5: _context13.t43 = _context13.sent;
                          _context13.next = 8;
                          return get(6);
                        case 8: _context13.t44 = _context13.sent;
                          return _context13.abrupt("return", [_context13.t42, _context13.t43, _context13.t44]);
                        case 10:
                        case "end": return _context13.stop();
                      }
                    }, _callee13, this);
                  }));
                case 2: other = _context14.sent;
                  _context14.next = 5;
                  return get(1);
                case 5: _context14.t45 = _context14.sent;
                  _context14.next = 8;
                  return get(2);
                case 8: _context14.t46 = _context14.sent;
                  _context14.next = 11;
                  return get(3);
                case 11: _context14.t47 = _context14.sent;
                  return _context14.abrupt("return", [_context14.t45, _context14.t46, _context14.t47].concat(other));
                case 13:
                case "end": return _context14.stop();
              }
            }, _callee14, this);
          }));

          fn(function (err, res) {
            if (err) {
              return done(err);
            }
            expect(res).to.deep.equal([1, 2, 3, 4, 5, 6]);
            done();
          });
        });
      });
    });

    describe("when yielding neither a function nor a promise", function () {
      it("should throw", function (done) {
        var errors = [];

        c0(regeneratorRuntime.mark(function _callee15() {
          var msg;
          return regeneratorRuntime.wrap(function _callee15$(_context15) {
            while (true) switch (_context15.prev = _context15.next) {
              case 0: _context15.prev = 0;
                _context15.next = 3;
                return "something";
              case 3: _context15.next = 8;
                break;
              case 5: _context15.prev = 5;
                _context15.t48 = _context15["catch"](0);
                errors.push(_context15.t48.message);
              case 8: _context15.prev = 8;
                _context15.next = 11;
                return "something";
              case 11: _context15.next = 16;
                break;
              case 13: _context15.prev = 13;
                _context15.t49 = _context15["catch"](8);
                errors.push(_context15.t49.message);
              case 16:

                expect(errors).to.have.length(2);
                msg = "yield a function, promise, generator, array, or object";
                expect(!!errors[0].match(msg)).to.equal(true);
                expect(!!errors[1].match(msg)).to.equal(true);
              case 20:
              case "end": return _context15.stop();
            }
          }, _callee15, this, [[0, 5], [8, 13]]);
        }))(done);
      });
    });

    describe("with errors", function () {
      it("should throw", function (done) {
        var errors = [];

        c0(regeneratorRuntime.mark(function _callee16() {
          return regeneratorRuntime.wrap(function _callee16$(_context16) {
            while (true) switch (_context16.prev = _context16.next) {
              case 0: _context16.prev = 0;
                _context16.next = 3;
                return get(1, new Error("foo"));
              case 3: _context16.next = 8;
                break;
              case 5: _context16.prev = 5;
                _context16.t50 = _context16["catch"](0);
                errors.push(_context16.t50.message);
              case 8: _context16.prev = 8;
                _context16.next = 11;
                return get(1, new Error("bar"));
              case 11: _context16.next = 16;
                break;
              case 13: _context16.prev = 13;
                _context16.t51 = _context16["catch"](8);
                errors.push(_context16.t51.message);
              case 16:

                expect(errors).to.deep.equal(["foo", "bar"]);
              case 17:
              case "end": return _context16.stop();
            }
          }, _callee16, this, [[0, 5], [8, 13]]);
        }))(done);
      });

      it("should catch errors on .send()", function (done) {
        var errors = [];

        c0(regeneratorRuntime.mark(function _callee17() {
          return regeneratorRuntime.wrap(function _callee17$(_context17) {
            while (true) switch (_context17.prev = _context17.next) {
              case 0: _context17.prev = 0;
                _context17.next = 3;
                return get(1, null, new Error("foo"));
              case 3: _context17.next = 8;
                break;
              case 5: _context17.prev = 5;
                _context17.t52 = _context17["catch"](0);
                errors.push(_context17.t52.message);
              case 8: _context17.prev = 8;
                _context17.next = 11;
                return get(1, null, new Error("bar"));
              case 11: _context17.next = 16;
                break;
              case 13: _context17.prev = 13;
                _context17.t53 = _context17["catch"](8);
                errors.push(_context17.t53.message);
              case 16:

                expect(errors).to.deep.equal(["foo", "bar"]);
              case 17:
              case "end": return _context17.stop();
            }
          }, _callee17, this, [[0, 5], [8, 13]]);
        }))(done);
      });

      it("should pass future errors to the callback", function (done) {
        c0(regeneratorRuntime.mark(function _callee18() {
          return regeneratorRuntime.wrap(function _callee18$(_context18) {
            while (true) switch (_context18.prev = _context18.next) {
              case 0: _context18.next = 2;
                return get(1);
              case 2: _context18.next = 4;
                return get(2, null, new Error("fail"));
              case 4:
                assert(false);
                _context18.next = 7;
                return get(3);
              case 7:
              case "end": return _context18.stop();
            }
          }, _callee18, this);
        }))(function (err) {
          expect(err.message).to.equal("fail");
          done();
        });
      });

      it("should pass immediate errors to the callback", function (done) {
        c0(regeneratorRuntime.mark(function _callee19() {
          return regeneratorRuntime.wrap(function _callee19$(_context19) {
            while (true) switch (_context19.prev = _context19.next) {
              case 0: _context19.next = 2;
                return get(1);
              case 2: _context19.next = 4;
                return get(2, new Error("fail"));
              case 4:
                assert(false);
                _context19.next = 7;
                return get(3);
              case 7:
              case "end": return _context19.stop();
            }
          }, _callee19, this);
        }))(function (err) {
          expect(err.message).to.equal("fail");
          done();
        });
      });

      it("should catch errors on the first invocation", function (done) {
        c0(regeneratorRuntime.mark(function _callee20() {
          return regeneratorRuntime.wrap(function _callee20$(_context20) {
            while (true) switch (_context20.prev = _context20.next) {
              case 0: throw new Error("fail");
              case 1:
              case "end": return _context20.stop();
            }
          }, _callee20, this);
        }))(function (err) {
          expect(err.message).to.equal("fail");
          done();
        });
      });
    });
  });
};

},{"c0":1}],20:[function(require,module,exports){
"use strict";

var expect = chai.expect;
var annotate = require('di').annotate;
var hasAnnotation = require('di').hasAnnotation;
var readAnnotations = require('di').readAnnotations;
var Inject = require('di').Inject;
var InjectLazy = require('di').InjectLazy;
var InjectPromise = require('di').InjectPromise;
var Provide = require('di').Provide;
var ProvidePromise = require('di').ProvidePromise;
exports["default"] = function () {
  describe("hasAnnotation", function () {
    it("should return false if fn not annotated", function () {
      function foo() {}
      var Bar = function Bar() {};

      var SomeAnnotation = function SomeAnnotation() {};

      expect(hasAnnotation(foo, SomeAnnotation)).to.equal(false);
      expect(hasAnnotation(Bar, SomeAnnotation)).to.equal(false);
    });


    it("should return true if the fn has an instance of given annotation", function () {
      var SomeAnnotation = function SomeAnnotation() {};

      annotate(foo, new SomeAnnotation());
      function foo() {}

      expect(hasAnnotation(foo, SomeAnnotation)).to.equal(true);
    });


    it("should return false if fn does not have given annotation", function () {
      var YepAnnotation = function YepAnnotation() {};

      var NopeAnnotation = function NopeAnnotation() {};

      annotate(foo, new YepAnnotation());
      function foo() {}

      expect(hasAnnotation(foo, NopeAnnotation)).to.equal(false);
    });
  });

  describe("readAnnotations", function () {
    it("should read @Provide", function () {
      var Bar = function Bar() {};

      var Foo = function Foo() {};

      annotate(Foo, new Provide(Bar));

      var annotations = readAnnotations(Foo);

      expect(annotations.provide.token).to.equal(Bar);
      expect(annotations.provide.isPromise).to.equal(false);
    });

    it("should read @ProvidePromise", function () {
      var Bar = function Bar() {};

      var Foo = function Foo() {};

      annotate(Foo, new ProvidePromise(Bar));

      var annotations = readAnnotations(Foo);

      expect(annotations.provide.token).to.equal(Bar);
      expect(annotations.provide.isPromise).to.equal(true);
    });

    it("should read @Inject", function () {
      var One = function One() {};

      var Two = function Two() {};

      var Foo = function Foo() {};

      annotate(Foo, new Inject(One, Two));

      var annotations = readAnnotations(Foo);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(false);
      expect(annotations.params[0].isLazy).to.equal(false);

      expect(annotations.params[1].token).to.equal(Two);
      expect(annotations.params[1].isPromise).to.equal(false);
      expect(annotations.params[1].isLazy).to.equal(false);
    });

    it("should read @InjectLazy", function () {
      var One = function One() {};

      var Foo = function Foo() {};

      annotate(Foo, new InjectLazy(One));

      var annotations = readAnnotations(Foo);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(false);
      expect(annotations.params[0].isLazy).to.equal(true);
    });

    it("should read @InjectPromise", function () {
      var One = function One() {};

      var Foo = function Foo() {};

      annotate(Foo, new InjectPromise(One));

      var annotations = readAnnotations(Foo);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(true);
      expect(annotations.params[0].isLazy).to.equal(false);
    });

    it("should read stacked @Inject{Lazy, Promise} annotations", function () {
      var One = function One() {};

      var Two = function Two() {};

      var Three = function Three() {};

      var Foo = function Foo() {};

      annotate(Foo, new Inject(One));
      annotate(Foo, new InjectLazy(Two));
      annotate(Foo, new InjectPromise(Three));

      var annotations = readAnnotations(Foo);

      expect(annotations.params[0].token).to.equal(One);
      expect(annotations.params[0].isPromise).to.equal(false);
      expect(annotations.params[0].isLazy).to.equal(false);

      expect(annotations.params[1].token).to.equal(Two);
      expect(annotations.params[1].isPromise).to.equal(false);
      expect(annotations.params[1].isLazy).to.equal(true);

      expect(annotations.params[2].token).to.equal(Three);
      expect(annotations.params[2].isPromise).to.equal(true);
      expect(annotations.params[2].isLazy).to.equal(false);
    });
  });
};

},{"di":3}],21:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var annotate = require('di').annotate;
var Injector = require('di').Injector;
var Inject = require('di').Inject;
var InjectPromise = require('di').InjectPromise;
var ProvidePromise = require('di').ProvidePromise;
var TransientScope = require('di').TransientScope;
var expect = chai.expect;
var UserList = function UserList() {};

// An async provider.
annotate(fetchUsers, new ProvidePromise(UserList));
function fetchUsers() {
  return Promise.resolve(new UserList());
}

var SynchronousUserList = function SynchronousUserList() {};

var UserController = function UserController(list) {
  this.list = list;
};

annotate(UserController, new Inject(UserList));

var SmartUserController = function SmartUserController(promise) {
  this.promise = promise;
};

annotate(SmartUserController, new InjectPromise(UserList));

exports["default"] = function () {
  describe("async", function () {
    it("should return a promise", function () {
      var injector = new Injector([fetchUsers]);
      var p = injector.getPromise(UserList);

      expect(p).to.be["instanceof"](Promise);
    });

    it("should throw when instantiating promise provider synchronously", function () {
      var injector = new Injector([fetchUsers]);

      expect(function () {
        return injector.get(UserList);
      }).to["throw"](/Cannot instantiate .* synchronously\. It is provided as a promise!/);
    });

    it("should return promise even if the provider is sync", function () {
      var injector = new Injector();
      var p = injector.getPromise(SynchronousUserList);

      expect(p).to.be["instanceof"](Promise);
    });

    // regression
    it("should return promise even if the provider is sync, from cache", function () {
      var injector = new Injector();
      /* jshint -W004 */
      var p1 = injector.getPromise(SynchronousUserList);
      var p1 = injector.getPromise(SynchronousUserList);
      /* jshint +W004 */

      expect(p1).to.be["instanceof"](Promise);
    });

    it("should return promise when a dependency is async", function (done) {
      var injector = new Injector([fetchUsers]);

      injector.getPromise(UserController).then(function (userController) {
        expect(userController).to.be["instanceof"](UserController);
        expect(userController.list).to.be["instanceof"](UserList);
        done();
      })["catch"](function (err) {
        console.log(err);
      });
    });

    // regression
    it("should return a promise even from parent injector", function () {
      var injector = new Injector([SynchronousUserList]);
      var childInjector = injector.createChild([]);

      expect(childInjector.getPromise(SynchronousUserList)).to.be["instanceof"](Promise);
    });

    it("should throw when a dependency is async", function () {
      var injector = new Injector([fetchUsers]);

      expect(function () {
        return injector.get(UserController);
      }).to["throw"](/Cannot instantiate .* synchronously\. It is provided as a promise! (.* -> .*)/);
    });

    it("should resolve synchronously when async dependency requested as a promise", function () {
      var injector = new Injector([fetchUsers]);
      var controller = injector.get(SmartUserController);

      expect(controller).to.be["instanceof"](SmartUserController);
      expect(controller.promise).to.be["instanceof"](Promise);
    });

    // regression
    it("should not cache TransientScope", function (done) {
      var NeverCachedUserController = function NeverCachedUserController(list) {
        this.list = list;
      };

      annotate(NeverCachedUserController, new TransientScope());
      annotate(NeverCachedUserController, new Inject(UserList));

      var injector = new Injector([fetchUsers]);

      injector.getPromise(NeverCachedUserController).then(function (controller1) {
        injector.getPromise(NeverCachedUserController).then(function (controller2) {
          expect(controller1).not.to.equal(controller2);
          done();
        });
      });
    });

    it("should allow async dependency in a parent constructor", function (done) {
      var ChildUserController = (function (UserController) {
        var ChildUserController = function ChildUserController() {
          UserController.apply(this, arguments);
        };

        _extends(ChildUserController, UserController);

        return ChildUserController;
      })(UserController);

      var injector = new Injector([fetchUsers]);

      injector.getPromise(ChildUserController).then(function (childUserController) {
        expect(childUserController).to.be["instanceof"](ChildUserController);
        expect(childUserController.list).to.be["instanceof"](UserList);
        done();
      });
    });
  });
};

},{"di":3}],22:[function(require,module,exports){
"use strict";

exports.createEngine = createEngine;
var annotate = require('di').annotate;
var Inject = require('di').Inject;
var Provide = require('di').Provide;
var Engine = function Engine() {};

exports.Engine = Engine;
var Car = (function () {
  var Car = function Car(engine) {
    this.engine = engine;
  };

  Car.prototype.start = function () {};

  return Car;
})();

exports.Car = Car;
function createEngine() {
  return "strong engine";
}

var CyclicEngine = function CyclicEngine(car) {};

exports.CyclicEngine = CyclicEngine;


// This is an example of using annotate helper, instead of annotations.

// @Inject(Engine)
annotate(Car, new Inject(Engine));

// @Provide(Engine)
annotate(createEngine, new Provide(Engine));

// @Inject(Car)
annotate(CyclicEngine, new Inject(Car));
// @Provide(Engine)
annotate(CyclicEngine, new Provide(Engine));

},{"di":3}],23:[function(require,module,exports){
"use strict";

var annotate = require('di').annotate;
var Inject = require('di').Inject;
var Provide = require('di').Provide;
var House = (function () {
  var House = function House(kitchen) {};

  House.prototype.nothing = function () {};

  return House;
})();

exports.House = House;
annotate(House, new Provide("House"));
annotate(House, new Inject("Kitchen"));

var Kitchen = (function () {
  var Kitchen = function Kitchen(sink) {};

  Kitchen.prototype.nothing = function () {};

  return Kitchen;
})();

exports.Kitchen = Kitchen;
annotate(Kitchen, new Provide("Kitchen"));
annotate(Kitchen, new Inject("Sink"));

var house = exports.house = [House, Kitchen];

},{"di":3}],24:[function(require,module,exports){
"use strict";

var annotate = require('di').annotate;
var Inject = require('di').Inject;
var Provide = require('di').Provide;
var ShinyHouse = (function () {
  var ShinyHouse = function ShinyHouse(kitchen) {};

  ShinyHouse.prototype.nothing = function () {};

  return ShinyHouse;
})();

exports.ShinyHouse = ShinyHouse;
annotate(ShinyHouse, new Provide("House"));
annotate(ShinyHouse, new Inject("Kitchen"));

var house = exports.house = [ShinyHouse];

},{"di":3}],25:[function(require,module,exports){
"use strict";

var annonSpec = require('./annotations')["default"];
var asyncSpec = require('./async')["default"];
var injSpec = require('./injector')["default"];



describe("di Framework", function () {
  annonSpec();
  asyncSpec();
  injSpec();
});

},{"./annotations":20,"./async":21,"./injector":26}],26:[function(require,module,exports){
"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var annotate = require('di').annotate;
var Injector = require('di').Injector;
var Inject = require('di').Inject;
var InjectLazy = require('di').InjectLazy;
var Provide = require('di').Provide;
var SuperConstructor = require('di').SuperConstructor;
var TransientScope = require('di').TransientScope;
var Car = require('./fixtures/car').Car;
var CyclicEngine = require('./fixtures/car').CyclicEngine;
var houseModule = require('./fixtures/house').house;
var shinyHouseModule = require('./fixtures/shiny_house').house;
var expect = chai.expect;
exports["default"] = function () {
  describe("injector", function () {
    it("should instantiate a class without dependencies", function () {
      var Car = (function () {
        var Car = function Car() {};

        Car.prototype.start = function () {};

        return Car;
      })();

      var injector = new Injector();
      var car = injector.get(Car);

      expect(car).to.be["instanceof"](Car);
    });

    it("should resolve dependencies based on @Inject annotation", function () {
      var Engine = (function () {
        var Engine = function Engine() {};

        Engine.prototype.start = function () {};

        return Engine;
      })();

      var Car = (function () {
        var Car = function Car(engine) {
          this.engine = engine;
        };

        Car.prototype.start = function () {};

        return Car;
      })();

      annotate(Car, new Inject(Engine));

      var injector = new Injector();
      var car = injector.get(Car);

      expect(car).to.be["instanceof"](Car);
      expect(car.engine).to.be["instanceof"](Engine);
    });

    it("should override providers", function () {
      var Engine = function Engine() {};

      var Car = (function () {
        var Car = function Car(engine) {
          this.engine = engine;
        };

        Car.prototype.start = function () {};

        return Car;
      })();

      annotate(Car, new Inject(Engine));

      var MockEngine = (function () {
        var MockEngine = function MockEngine() {};

        MockEngine.prototype.start = function () {};

        return MockEngine;
      })();

      annotate(MockEngine, new Provide(Engine));

      var injector = new Injector([MockEngine]);
      var car = injector.get(Car);

      expect(car).to.be["instanceof"](Car);
      expect(car.engine).to.be["instanceof"](MockEngine);
    });

    it("should allow factory function", function () {
      var Size = function Size() {};

      annotate(computeSize, new Provide(Size));
      function computeSize() {
        return 0;
      }

      var injector = new Injector([computeSize]);
      var size = injector.get(Size);

      expect(size).to.equal(0);
    });

    it("should cache instances", function () {
      var Car = function Car() {};

      var injector = new Injector();
      var car = injector.get(Car);

      expect(injector.get(Car)).to.equal(car);
    });

    it("should throw when no provider defined", function () {
      var injector = new Injector();

      expect(function () {
        return injector.get("NonExisting");
      }).to["throw"]("No provider for NonExisting!");
    });

    it("should show the full path when no provider defined", function () {
      var injector = new Injector(houseModule);

      expect(function () {
        return injector.get("House");
      }).to["throw"]("No provider for Sink! (House -> Kitchen -> Sink)");
    });

    it("should throw when trying to instantiate a cyclic dependency", function () {
      var injector = new Injector([CyclicEngine]);

      expect(function () {
        return injector.get(Car);
      }).to["throw"](/Cannot instantiate cyclic dependency! (.* -> .* -> .*)/);
    });

    it("should show the full path when error happens in a constructor", function () {
      var Engine = function Engine() {
        throw new Error("This engine is broken!");
      };

      var Car = function Car(e) {};

      annotate(Car, new Inject(Engine));

      var injector = new Injector();

      expect(function () {
        return injector.get(Car);
      }).to["throw"](/Error during instantiation of .*! \(.* -> .*\)/);
    });

    it("should throw an error when used in a class without any parent", function () {
      var WithoutParent = function WithoutParent() {};

      annotate(WithoutParent, new Inject(SuperConstructor));

      var injector = new Injector();

      expect(function () {
        injector.get(WithoutParent);
      }).to["throw"](/Only classes with a parent can ask for SuperConstructor!/);
    });

    it("should throw an error when null/undefined token requested", function () {
      var injector = new Injector();

      expect(function () {
        injector.get(null);
      }).to["throw"](/Invalid token "null" requested!/);

      expect(function () {
        injector.get(undefined);
      }).to["throw"](/Invalid token "undefined" requested!/);
    });

    // regression
    it("should show the full path when null/undefined token requested", function () {
      var Foo = function Foo() {};

      annotate(Foo, new Inject(undefined));

      var Bar = function Bar() {};

      annotate(Bar, new Inject(null));

      var injector = new Injector();

      expect(function () {
        injector.get(Foo);
      }).to["throw"](/Invalid token "undefined" requested! \(.* -> undefined\)/);

      expect(function () {
        injector.get(Bar);
      }).to["throw"](/Invalid token "null" requested! \(.* -> null\)/);
    });

    it("should provide itself", function () {
      var injector = new Injector();

      expect(injector.get(Injector)).to.equal(injector);
    });

    describe("SuperConstructor", function () {
      it("should support \"super\" to call a parent constructor", function () {
        var Something = function Something() {};

        var Parent = function Parent(something) {
          this.parentSomething = something;
        };

        annotate(Parent, new Inject(Something));

        var Child = (function (Parent) {
          var Child = function Child(superConstructor, something) {
            superConstructor();
            this.childSomething = something;
          };

          _extends(Child, Parent);

          return Child;
        })(Parent);

        annotate(Child, new Inject(SuperConstructor, Something));

        var injector = new Injector();
        var instance = injector.get(Child);

        expect(instance.parentSomething).to.be["instanceof"](Something);
        expect(instance.childSomething).to.be["instanceof"](Something);
        expect(instance.childSomething).to.equal(instance.parentSomething);
      });

      it("should support \"super\" to call multiple parent constructors", function () {
        var Foo = function Foo() {};

        var Bar = function Bar() {};

        var Parent = function Parent(foo) {
          this.parentFoo = foo;
        };

        annotate(Parent, new Inject(Foo));

        var Child = (function (Parent) {
          var Child = function Child(superConstructor, foo) {
            superConstructor();
            this.childFoo = foo;
          };

          _extends(Child, Parent);

          return Child;
        })(Parent);

        annotate(Child, new Inject(SuperConstructor, Foo));

        var GrandChild = (function (Child) {
          var GrandChild = function GrandChild(superConstructor, foo, bar) {
            superConstructor();
            this.grandChildBar = bar;
            this.grandChildFoo = foo;
          };

          _extends(GrandChild, Child);

          return GrandChild;
        })(Child);

        annotate(GrandChild, new Inject(SuperConstructor, Foo, Bar));

        var injector = new Injector();
        var instance = injector.get(GrandChild);

        expect(instance.parentFoo).to.be["instanceof"](Foo);
        expect(instance.childFoo).to.be["instanceof"](Foo);
        expect(instance.grandChildFoo).to.be["instanceof"](Foo);
        expect(instance.grandChildBar).to.be["instanceof"](Bar);
      });

      it("should throw an error when used in a factory function", function () {
        var Something = function Something() {};

        annotate(createSomething, new Provide(Something));
        annotate(createSomething, new Inject(SuperConstructor));
        function createSomething() {}

        expect(function () {
          var injector = new Injector([createSomething]);
          injector.get(Something);
        }).to["throw"](/Only classes with a parent can ask for SuperConstructor!/);
      });
    });



    describe("transient", function () {
      it("should never cache", function () {
        var Foo = function Foo() {};

        annotate(Foo, new TransientScope());

        var injector = new Injector();
        expect(injector.get(Foo)).not.to.equal(injector.get(Foo));
      });

      it("should always use dependencies (default providers) from the youngest injector", function () {
        var Foo = function Foo() {};

        annotate(Foo, new Inject());

        var AlwaysNewInstance = function AlwaysNewInstance(foo) {
          this.foo = foo;
        };

        annotate(AlwaysNewInstance, new TransientScope());
        annotate(AlwaysNewInstance, new Inject(Foo));

        var injector = new Injector();
        var child = injector.createChild([Foo]); // force new instance of Foo

        var fooFromChild = child.get(Foo);
        var fooFromParent = injector.get(Foo);

        var alwaysNew1 = child.get(AlwaysNewInstance);
        var alwaysNew2 = child.get(AlwaysNewInstance);
        var alwaysNewFromParent = injector.get(AlwaysNewInstance);

        expect(alwaysNew1.foo).to.equal(fooFromChild);
        expect(alwaysNew2.foo).to.equal(fooFromChild);
        expect(alwaysNewFromParent.foo).to.equal(fooFromParent);
      });

      it("should always use dependencies from the youngest injector", function () {
        var Foo = function Foo() {};

        annotate(Foo, new Inject());

        var AlwaysNewInstance = function AlwaysNewInstance(foo) {
          this.foo = foo;
        };

        annotate(AlwaysNewInstance, new TransientScope());
        annotate(AlwaysNewInstance, new Inject(Foo));

        var injector = new Injector([AlwaysNewInstance]);
        var child = injector.createChild([Foo]); // force new instance of Foo

        var fooFromChild = child.get(Foo);
        var fooFromParent = injector.get(Foo);

        var alwaysNew1 = child.get(AlwaysNewInstance);
        var alwaysNew2 = child.get(AlwaysNewInstance);
        var alwaysNewFromParent = injector.get(AlwaysNewInstance);

        expect(alwaysNew1.foo).to.equal(fooFromChild);
        expect(alwaysNew2.foo).to.equal(fooFromChild);
        expect(alwaysNewFromParent.foo).to.equal(fooFromParent);
      });
    });

    describe("child", function () {
      it("should load instances from parent injector", function () {
        var Car = (function () {
          var Car = function Car() {};

          Car.prototype.start = function () {};

          return Car;
        })();

        var parent = new Injector([Car]);
        var child = parent.createChild([]);

        var carFromParent = parent.get(Car);
        var carFromChild = child.get(Car);

        expect(carFromChild).to.equal(carFromParent);
      });

      it("should create new instance in a child injector", function () {
        var Car = (function () {
          var Car = function Car() {};

          Car.prototype.start = function () {};

          return Car;
        })();

        var MockCar = (function () {
          var MockCar = function MockCar() {};

          MockCar.prototype.start = function () {};

          return MockCar;
        })();

        annotate(MockCar, new Provide(Car));

        var parent = new Injector([Car]);
        var child = parent.createChild([MockCar]);

        var carFromParent = parent.get(Car);
        var carFromChild = child.get(Car);

        expect(carFromParent).not.to.equal(carFromChild);
        expect(carFromChild).to.be["instanceof"](MockCar);
      });

      it("should force new instances by annotation", function () {
        var RouteScope = function RouteScope() {};

        var Engine = (function () {
          var Engine = function Engine() {};

          Engine.prototype.start = function () {};

          return Engine;
        })();

        var Car = (function () {
          var Car = function Car(engine) {
            this.engine = engine;
          };

          Car.prototype.start = function () {};

          return Car;
        })();

        annotate(Car, new RouteScope());
        annotate(Car, new Inject(Engine));

        var parent = new Injector([Car, Engine]);
        var child = parent.createChild([], [RouteScope]);

        var carFromParent = parent.get(Car);
        var carFromChild = child.get(Car);

        expect(carFromChild).not.to.equal(carFromParent);
        expect(carFromChild.engine).to.equal(carFromParent.engine);
      });

      it("should force new instances by annotation using overridden provider", function () {
        var RouteScope = function RouteScope() {};

        var Engine = (function () {
          var Engine = function Engine() {};

          Engine.prototype.start = function () {};

          return Engine;
        })();

        var MockEngine = (function () {
          var MockEngine = function MockEngine() {};

          MockEngine.prototype.start = function () {};

          return MockEngine;
        })();

        annotate(MockEngine, new RouteScope());
        annotate(MockEngine, new Provide(Engine));

        var parent = new Injector([MockEngine]);
        var childA = parent.createChild([], [RouteScope]);
        var childB = parent.createChild([], [RouteScope]);

        var engineFromA = childA.get(Engine);
        var engineFromB = childB.get(Engine);

        expect(engineFromA).not.to.equal(engineFromB);
        expect(engineFromA).to.be["instanceof"](MockEngine);
        expect(engineFromB).to.be["instanceof"](MockEngine);
      });

      it("should force new instance by annotation using the lowest overridden provider", function () {
        var RouteScope = function RouteScope() {};

        var Engine = (function () {
          var Engine = function Engine() {};

          Engine.prototype.start = function () {};

          return Engine;
        })();

        annotate(Engine, new RouteScope());

        var MockEngine = (function () {
          var MockEngine = function MockEngine() {};

          MockEngine.prototype.start = function () {};

          return MockEngine;
        })();

        annotate(MockEngine, new Provide(Engine));
        annotate(MockEngine, new RouteScope());

        var DoubleMockEngine = (function () {
          var DoubleMockEngine = function DoubleMockEngine() {};

          DoubleMockEngine.prototype.start = function () {};

          return DoubleMockEngine;
        })();

        annotate(DoubleMockEngine, new Provide(Engine));
        annotate(DoubleMockEngine, new RouteScope());

        var parent = new Injector([Engine]);
        var child = parent.createChild([MockEngine]);
        var grantChild = child.createChild([], [RouteScope]);

        var engineFromParent = parent.get(Engine);
        var engineFromChild = child.get(Engine);
        var engineFromGrantChild = grantChild.get(Engine);

        expect(engineFromParent).to.be["instanceof"](Engine);
        expect(engineFromChild).to.be["instanceof"](MockEngine);
        expect(engineFromGrantChild).to.be["instanceof"](MockEngine);
        expect(engineFromGrantChild).not.to.equal(engineFromChild);
      });

      it("should show the full path when no provider", function () {
        var parent = new Injector(houseModule);
        var child = parent.createChild(shinyHouseModule);

        expect(function () {
          return child.get("House");
        }).to["throw"]("No provider for Sink! (House -> Kitchen -> Sink)");
      });

      it("should provide itself", function () {
        var parent = new Injector();
        var child = parent.createChild([]);

        expect(child.get(Injector)).to.equal(child);
      });

      it("should cache default provider in parent injector", function () {
        var Foo = function Foo() {};

        annotate(Foo, new Inject());

        var parent = new Injector();
        var child = parent.createChild([]);

        var fooFromChild = child.get(Foo);
        var fooFromParent = parent.get(Foo);

        expect(fooFromParent).to.equal(fooFromChild);
      });

      it("should force new instance by annotation for default provider", function () {
        var RequestScope = function RequestScope() {};

        var Foo = function Foo() {};

        annotate(Foo, new Inject());
        annotate(Foo, new RequestScope());

        var parent = new Injector();
        var child = parent.createChild([], [RequestScope]);

        var fooFromChild = child.get(Foo);
        var fooFromParent = parent.get(Foo);

        expect(fooFromParent).not.to.equal(fooFromChild);
      });
    });

    describe("lazy", function () {
      it("should instantiate lazily", function () {
        var constructorSpy = sinon.spy();

        var ExpensiveEngine = function ExpensiveEngine() {
          constructorSpy();
        };

        var Car = (function () {
          var Car = function Car(createEngine) {
            this.engine = null;
            this.createEngine = createEngine;
          };

          Car.prototype.start = function () {
            this.engine = this.createEngine();
          };

          return Car;
        })();

        annotate(Car, new InjectLazy(ExpensiveEngine));

        var injector = new Injector();
        var car = injector.get(Car);

        expect(constructorSpy).not.to.have.been.called;

        car.start();
        expect(constructorSpy).to.have.been.called;
        expect(car.engine).to.be["instanceof"](ExpensiveEngine);
      });

      // regression
      it("should instantiate lazily from a parent injector", function () {
        var constructorSpy = sinon.spy();

        var ExpensiveEngine = function ExpensiveEngine() {
          constructorSpy();
        };

        var Car = (function () {
          var Car = function Car(createEngine) {
            this.engine = null;
            this.createEngine = createEngine;
          };

          Car.prototype.start = function () {
            this.engine = this.createEngine();
          };

          return Car;
        })();

        annotate(Car, new InjectLazy(ExpensiveEngine));

        var injector = new Injector([ExpensiveEngine]);
        var childInjector = injector.createChild([Car]);
        var car = childInjector.get(Car);

        expect(constructorSpy).not.to.have.been.called;

        car.start();
        expect(constructorSpy).to.have.been.called;
        expect(car.engine).to.be["instanceof"](ExpensiveEngine);
      });

      describe("with locals", function () {
        it("should always create a new instance", function () {
          var constructorSpy = sinon.spy();

          var ExpensiveEngine = function ExpensiveEngine(power) {
            constructorSpy();
            this.power = power;
          };

          annotate(ExpensiveEngine, new TransientScope());
          annotate(ExpensiveEngine, new Inject("power"));

          var Car = function Car(createEngine) {
            this.createEngine = createEngine;
          };

          annotate(Car, new InjectLazy(ExpensiveEngine));

          var injector = new Injector();
          var car = injector.get(Car);

          var veyronEngine = car.createEngine("power", 1184);
          var mustangEngine = car.createEngine("power", 420);

          expect(veyronEngine).not.to.equal(mustangEngine);
          expect(veyronEngine.power).to.equal(1184);
          expect(mustangEngine.power).to.equal(420);

          var mustangEngine2 = car.createEngine("power", 420);
          expect(mustangEngine).not.to.equal(mustangEngine2);
        });
      });
    });
  });
};

},{"./fixtures/car":22,"./fixtures/house":23,"./fixtures/shiny_house":24,"di":3}],27:[function(require,module,exports){
"use strict";

require('setimmediate');


console.log("\nThe MIT License (MIT)\n\nCopyright (c) 2014, markuz-brasil\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in\nall copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\nTHE SOFTWARE.\n\n");

mocha.setup("bdd");
mocha.reporter("html");

require('./di');

require('./c0');

mocha.run();

},{"./c0":14,"./di":25,"setimmediate":9}]},{},[27])


//# sourceMappingURL=maps/index.js.map