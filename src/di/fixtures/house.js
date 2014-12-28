
import {
  annotate,
  Inject,
  Provide,
} from 'di'

// This is an example of using string as tokens.


export class House {
  constructor(kitchen) {}
  nothing() {}
}
annotate(House, new Provide('House'))
annotate(House, new Inject('Kitchen'))

export class Kitchen {
  constructor(sink) {}
  nothing() {}
}
annotate(Kitchen, new Provide('Kitchen'))
annotate(Kitchen, new Inject('Sink'))

// Sink is missing.
// @Provide('Sink')
// export class Sink {
//   nothing() {}
// }

export var house = [House, Kitchen]
