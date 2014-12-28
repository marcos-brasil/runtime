// current 6to5 shim doesn't include setImmediate.
// but on v2.0 it will
import 'setimmediate'

import { readFileSync } from 'fs'
console.log(readFileSync('./LICENSE', 'utf8'))

mocha.setup('bdd')
mocha.reporter('html')

import './di'
import './c0'

mocha.run()
