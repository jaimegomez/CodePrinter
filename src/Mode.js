import { resolve } from 'helpers/index';

class Mode {
  static resolve(item) {
    const resolvedItem = resolve(item, this);
    if (typeof resolvedItem !== 'object') {
      throw new TypeError('Mode must be an object.');
    }
    return resolvedItem instanceof Mode ? resolvedItem : new Mode(resolvedItem);
  }

  constructor(extension = {}) {
    this.name = 'plaintext';
    this.keyMap = {};
    this.onLeftRemoval = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" }
    this.onRightRemoval = { '}': '{', ')': '(', ']': '[', '"': '"', "'": "'" }
    this.selectionWrappers = { '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'], '"': '"', "'": "'" }
    Object.assign(this, extension);
    this.init();
  }

  init() {}
  onEntry() {}
  onExit() {}

  initialState() {
    return {};
  }

  iterator(stream) {
    stream.skip();
    return '';
  }

  indent(stream) {
    return stream.indent;
  }

  isIndentTrigger(char) {
    return this.indentTriggers instanceof RegExp && this.indentTriggers.test(char);
  }

  isAutoCompleteTrigger(char) {
    return this.autoCompleteTriggers instanceof RegExp && this.autoCompleteTriggers.test(char);
  }
}

export default Mode;
