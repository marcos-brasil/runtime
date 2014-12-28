import {
  annotate,
  Inject,
  Provide,
} from 'di'


export class ShinyHouse {
  constructor(kitchen) {}

  nothing() {}
}
annotate(ShinyHouse, new Provide('House'))
annotate(ShinyHouse, new Inject('Kitchen'))

export var house = [ShinyHouse]
