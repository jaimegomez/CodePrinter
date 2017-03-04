import { createNode } from 'helpers/index';
import { updateLineView } from 'helpers/lineView';

const lineViewNode = createNode(null, 'div', 'cp-line-view');
const lineNumberWrapper = createNode(lineViewNode, 'div', 'cp-line-number-wrapper');
const lineNumberNode = createNode(lineNumberWrapper, 'div', 'cp-line-number');
const linePreNode = createNode(lineViewNode, 'pre', 'cp-line');

lineNumberNode.appendChild(document.createTextNode(''));

class LineView {
  constructor() {
    this.node = lineViewNode.cloneNode(true);
    this.counter = this.node.firstChild.firstChild;
    this.pre = this.node.lastChild;
    this.change = 0;
  }

  tail() {
    return this.line; // TODO: merged lines
  }

  update(text, tokens) {
    return updateLineView(this, text, tokens);
  }
}

export default LineView;
