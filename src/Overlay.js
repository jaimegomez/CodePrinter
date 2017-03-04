import EventEmitter from 'EventEmitter';
import { addClass, classArray, createNode, removeClass } from 'helpers/index';

class Overlay extends EventEmitter {
  constructor(classes) {
    super();
    this.node = createNode(null, 'div', classArray('cp-overlay', classes));
    return this;
  }

  show() {
    removeClass(this.node, 'cp-hidden');
  }

  hide() {
    addClass(this.node, 'cp-hidden');
  }
}

export default Overlay;
