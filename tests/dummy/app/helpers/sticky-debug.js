import Helper from '@ember/component/helper';

export default class StickyDebug extends Helper {
  compute(positional) {
    let [stickiness] = positional;

    switch (true) {
      case stickiness.isStickyTop:
        return 'Stuck to top';
      case stickiness.isStickyBottom:
        return 'Stuck to bottom';
      default:
        return 'Not sticky';
    }
  }
}
