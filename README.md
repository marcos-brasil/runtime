##### Features
| [ES6](https://github.com/sebmck/6to5)| [Browserify](http://browserify.org/)| [Web Stater Kit](https://github.com/google/web-starter-kit)| [Jade](http://jade-lang.com/)| [LESS](http://lesscss.org/)| [SASS](https://github.com/sass/node-sass)| [Mocha](http://mochajs.org/)
|--- |--- |--- |--- |--- |--- |--- |--- |---

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
