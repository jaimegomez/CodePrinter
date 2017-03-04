import EventEmitter from 'EventEmitter';
import { insertLineViewNode, removeLineViewNode, setCounter, touch } from 'helpers/view';

class View extends EventEmitter {
  constructor(doc) {
    super();
    this.propagateTo(doc);
    this.doc = doc;
    this.from = 0;
    this.to = -1;
    this.display = null;
    this.children = [];
  }

  get length() {
    return this.children.length;
  }

  scrollDown() {
    const next = this.lastLine().next();
    if (!next) return;
    const shifted = this.children.shift();
    ++this.from;
    this.push(shifted);
    return this.link(shifted, next);
  }

  scrollUp() {
    const prev = this.firstLine().prev();
    if (!prev) return;
    const popped = this.children.pop();
    --this.to;
    this.unshift(popped);
    return this.link(popped, prev);
  }

  each(func) {
    for (const child of this.children) {
      func.call(this, child);
    }
  }

  get(index) {
    return this.children[index];
  }

  getLine(index) {
    const lineView = this.children[index];
    return lineView && lineView.line;
  }

  indexOf(...args) {
    return this.children.indexOf(...args);
  }

  push(lineView) {
    ++this.to;
    insertLineViewNode(this, lineView, this.length);
    this.children.push(lineView);
    return lineView;
  }

  pop() {
    --this.to;
    const popped = this.children.pop();
    removeLineViewNode(this, popped);
    return popped;
  }

  shift() {
    ++this.from;
    const shifted = this.children.shift();
    removeLineViewNode(this, shifted);
    return shifted;
  }

  unshift(lineView) {
    --this.from;
    insertLineViewNode(this, lineView, 0);
    this.children.unshift(lineView);
    return lineView;
  }

  insert(index, lineView) {
    ++this.to;
    insertLineViewNode(this, lineView, index);
    this.children.splice(index, 0, lineView);
  }

  mount(display) {
    this.display = display;
    this.each(child => insertLineViewNode(this, child, this.children.length));
  }

  unmount() {
    this.each(child => removeLineViewNode(this, child));
    this.display = null;
  }

  height() {
    return this.children.reduce((acc, child) => {
      return acc + child.line.height;
    });
  }

  firstLine() {
    const { children } = this;
    return children.length ? children[0].line : null;
  }

  lastLine() {
    const { children } = this;
    const { length } = children;
    return length ? children[length - 1].tail() : null;
  }

  replaceLineInLineView(lineView, newLine, newLineIndex) {
    const doc = this.doc;
    this.setCounter(lineView, newLineIndex);
    this.link(lineView, newLine);
  }

  unlink(lineView) {
    const line = lineView.line;
    if (!line) {
      return;
    }
    if (lineView.line.view === lineView) {
      line.view = undefined;
      this.doc.emit('unlink', line);
    }
    lineView.line = undefined;
  }

  link(lineView, line) {
    this.unlink(lineView);
    lineView.change = true;
    lineView.line = line;
    lineView.size = 1;
    lineView.counterText = null;
    line.view = lineView;
    touch(line);
    this.doc.process(line);
    this.doc.emit('link', line);
    return lineView;
  }

  setCounter(lineView, lineIndex, width) {
    return setCounter(this.doc, lineView, lineIndex, width);
  }

  render(startLine, startIndex) {
    let i = startIndex - 1;
    let next = startLine;
    let sd = 0;
    let scrolled;

    while (next && ++i < this.length) {
      this.replaceLineInLineView(this.children[i], next, this.from + i);
      next = next.next(true);
    }
    if (i + 1 < this.length) {
      while (i++ < this.length && (scrolled = this.scrollUp())) {
        sd -= scrolled.line.height;
      }
      while (i < this.length && this.pop());
    }
    return sd;
  }
}

export default View;
