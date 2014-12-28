"use strict"
var path = require('path')
var fs = require('fs')
var rootPath = './node_modules/seed/node_modules'

var gulp = require('gulp')
require('seed')(gulp, {
  browserSync: {
    server: {
      baseDir: [
        './build',
        './dev',
        './public',
      ],
      middleware: [
        function (req, res, next) {
          // TODO: explain the reason for this middleware

          if ('GET' !== req.method && 'HEAD' !== req.method ) {
            return next()
          }

          var base = path.basename(req.url)
          var dir = path.dirname(req.url)

          if ('/tests/tests' === dir) {
            req.url = path.join('/tests', base)
          }

          if ('shims.js' === base) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/6to5/browser-polyfill.js', 'utf8'))
          }

          if ('mocha.css' === base) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/mocha/mocha.css', 'utf8'))
          }

          if ('mocha.js' === base) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/mocha/mocha.js', 'utf8'))
          }

          if ('chai.js' === base) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/chai/chai.js', 'utf8'))
          }

          if ('sinon-chai.js' === base) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/sinon-chai/lib/sinon-chai.js', 'utf8'))
          }

          if ('sinon.js' === base) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(fs.readFileSync(rootPath +'/sinon/pkg/sinon.js', 'utf8'))
          }

          next()
        },
      ],
    },
    logFileChanges: true,
    // reloadDelay: 5000,
    ghostMode: false,
    notify: false,
    port: 3000,
    browser: 'skip',
    // browser: 'chrome',

    // forces full page reload on css changes.
    injectChanges: false,

    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
  },
  less: {
    src: [
      './src/**/*.less',
    ],
    opt: {
      compress: false,
      paths: [
        './node_modules/bootstrap/less',
        './node_modules/famous/dist',
      ],
    },
  },
})





