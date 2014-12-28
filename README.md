##### Features
| [ES6](https://github.com/sebmck/6to5)| [Browserify](http://browserify.org/)| [Web Stater Kit](https://github.com/google/web-starter-kit)| [Jade](http://jade-lang.com/)| [LESS](http://lesscss.org/)| [SASS](https://github.com/sass/node-sass)| [Mocha](http://mochajs.org/)
|--- |--- |--- |--- |--- |--- |--- |--- |---

#### Cavets

- the runtime's [specs minified](http://markuz-brasil.github.io/runtime/build/) and [specs un-minified](http://markuz-brasil.github.io/runtime/dev/)

- [angular/di.js](https://github.com/angular/di.js) have an issue [angular/di.js#95](https://github.com/angular/di.js/issues/95) that fails on minified code. But there is a work around documented on the issue report.

- if a generator's logic is sync, c0 will behave sync (different from [co v3.1.0]()). The side effect is that if an error is throw within the body of the callback, this exception will be simply ignored tj/co#92 

  The solution is to simply to wrap the callback in a setImmediate, and use `process.on('uncaughtException', function () {})`
  
  ```javascript

    c0(function * gen () {
      // do stuff
    })(setImmediate(function (err) {
      // gen has finished
    }))
  ```

  The down side of this approach, is that you can't really do this on the browser. But what it can be done is to patch the global setImmediate, 
  here is a naive approach, which works with c0 only. 
  

  ```javascript
      function fakeSetImmediate (fn) {
        return (err) => {
          setImmediate(() => {
            try { fn(err) }
            catch (e) {
              // handle error
            }
          })
        }

      }

  ```

  Take a look at [angular/zone.js](https://github.com/angular/zone.js) for more robust patchers.

#### Goal
This repo's purpose is for testing libraries, framework (and their interaction) I intend to use on my personal projects. 

#### Quickstart

```
npm install --global gulp
```

This will install Gulp globally. Depending on your user account, you may need to gain elevated permissions using `sudo` (i.e `sudo npm install --global gulp`). Next, clone this repo and install the local dependencies runtime requires:

```sh
git clone --depth=1 https://github.com/markuz-brasil/runtime.git
cd runtime
npm install
```

That's it! You should now have everything needed to begin hacking on runtime.

#### Gulp Commands

You can now use Gulp with the following commands to stay productive during development:

##### Build & Optimize

```sh
gulp
```

##### Watch For Changes & Automatically Refresh Across Devices

```sh
# minimal dev mode (faster)
gulp watch serve dev

# full build mode (longer)
gulp watch serve build
```

Now direct your browser to `http://localhost:3000/`

#### License
[MIT](https://github.com/markuz-brasil/runtime/blob/master/LICENSE)
