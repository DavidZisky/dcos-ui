export default class Pipeline {
  constructor(callables) {
    this.callables = callables;
  }

  run(state, ...rest) {
    return this.callables.reduce(function(acc, callable) {
      return callable.call(callable, acc, ...rest);
    }, state);
  }
}
