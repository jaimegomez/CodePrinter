import CaretStyles from 'CaretStyles';
import EventEmitter from 'EventEmitter';
import { copy, createNode } from 'helpers/index';
import { replaceRange, removeRange } from 'helpers/document';
import { comparePos, normalizePos, pos, range, onewayRange } from 'statics';
import {
  docRemove,
  findWord,
  maybeReverseSelection,
  positionAfterMove,
  rangeWithMove,
} from 'helpers/caret';

let caretId = 0;
const activeClassName = 'cp-active-line';

const storage = new WeakMap();
// [caret] => {
//   doc, head, anchor, currentLine, lastMeasure, parserState
// }
// storage for caret's private data

class Caret extends EventEmitter {
  constructor(doc) {
    super();
    this.propagateTo(doc);

    this.x = this.y = 0;
    this.node = createNode(null, 'div', 'cp-caret');
    Object.defineProperty(this, 'id', { value: caretId++ });

    storage.set(this, {
      doc,
      head: pos(0, 0),
      anchor: null,
      currentLine: null,
      lastMeasure: null,
      parserState: null,
    });
  }

  get doc() {
    return storage.get(this).doc;
  }

  anchor(real) {
    const { anchor } = storage.get(this);
    if (anchor && (real || comparePos(anchor, this.head()))) {
      return copy(anchor);
    }
    return null;
  }

  beginSelection() {
    const store = storage.get(this);
    this.clearSelection();
    store.anchor = this.head();
  }

  blur() {
    const { currentLine } = storage.get(this);
    unselect(this, currentLine);
  }

  clearSelection() {
    const store = storage.get(this);
    if (store.anchor) {
      store.doc.selectionLayer.clear(this.id);
      store.anchor = null;
      select(store.doc, this, store.currentLine);
      this.emit('selectionCleared');
    }
    return this;
  }

  column() {
    const { currentLine, head } = storage.get(this);
    return currentLine ? Math.min(head.column, currentLine.text.length) : 0;
  }

  dispatch(measure) {
    const store = storage.get(this);
    const { currentLine, doc, head, anchor } = store;
    const { line, lineIndex, column } = measure;
    let b = !doc.isFocused;

    if (currentLine !== line) {
      unselect(this, currentLine);
      select(doc, this, store.currentLine = line);
    }
    if (head.line !== lineIndex) {
      // if (!line.text && doc.getOption('autoIndentBlankLines')) {
      //   quietChange(doc, line, nextLineIndent(doc, line));
      //   doc.parse(line);
      //   column = line.text.length;
      //   measure.offsetX += column * doc.sizes.font.width;
      // }
      this.emit('lineChange', line, lineIndex, column);
      head.line = lineIndex;
      b = true;
    }
    if (head.column !== column) {
      this.emit('columnChange', line, lineIndex, column);
      head.column = column;
      b = true;
    }
    this.showSelection();

    b && this.emit('caretWillMove', head, anchor);
    store.lastMeasure = measure;
    store.parserState = undefined;
    setPixelPosition(doc, this, measure);
    doc.editor && doc.editor.focus();

    b && this.emit('caretMoved', head, anchor);
    this.emit('caretUpdated');
    return this;
  }

  eachLine(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('caret.eachLine(fn): fn must be a function!');
    }
    const { doc } = storage.get(this);
    const { from, to } = this.getRange();
    for (let i = from.line; i <= to.line; i++) {
      fn.call(this, doc.get(i), i, i - from.line);
    }
    return { from, to };
  }

  focus() {
    const store = storage.get(this);
    this.setHead(store.head);
    if (!this.hasSelection()) {
      select(store.doc, this, store.currentLine);
    }
  }

  getParserState() {
    const store = storage.get(this);
    return store.parserState = store.parserState || store.doc.getState(store.head);
  }

  getRange() {
    const { head } = storage.get(this);
    return this.getSelectionRange() || range(head, head);
  }

  getSelection() {
    const { doc } = storage.get(this);
    const range = this.getSelectionRange();
    return range ? doc.substring(range.from, range.to) : '';
  }

  getSelectionRange() {
    if (this.hasSelection()) {
      const { anchor, head } = storage.get(this);
      return onewayRange(anchor, head);
    }
  }

  hasSelection() {
    const { anchor } = storage.get(this);
    return !!anchor && comparePos(anchor, this.head()) !== 0;
  }

  head(real) {
    const { head } = storage.get(this);
    return real ? copy(head) : pos(head.line, this.column());
  }

  insert(text, movement) {
    const range = this.getRange();
    const { doc } = storage.get(this);
    doc.replaceRange(text, range.from, range.to);
    typeof movement === 'number' && this.moveX(movement);
    this.clearSelection();
    return this;
  }

  inSelection(position, boundary = false) {
    if (!position) return false;
    const { anchor, head } = storage.get(this);

    if (boundary) {
      return comparePos(anchor || head, position) * comparePos(position, head) >= 0;
    }
    return anchor && comparePos(anchor, position) * comparePos(position, head) > 0;
  }

  isCurrentLine(line) {
    const { currentLine } = storage.get(this);
    return currentLine === line;
  }

  line() {
    return storage.get(this).currentLine;
  }

  lineNumber() {
    const { head } = storage.get(this);
    return head.line;
  }

  match(pattern, dir, select = true) {
    const find = findWord(this.head(), this.textAtCurrentLine(), pattern, dir);
    if (select) {
      this.setSelection(find.from, find.to);
    }
    return find.word;
  }

  moveAnchor(move) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveAnchor(move): move should be a number!');
    }
    const store = storage.get(this);
    store.anchor = positionAfterMove(store.doc, store.anchor, move);
    this.showSelection();
  }

  moveSelectionTo(position) {
    const range = this.getSelectionRange();
    const { doc, head } = storage.get(this);

    if (!pos || !range || comparePos(range.from, pos) <= 0 && comparePos(pos, range.to) <= 0) {
      return false;
    }
    this.position(position);
    const { removed } = removeRange(doc, range.from, range.to);
    const anchor = this.head();
    replaceRange(doc, removed, head);
    this.setSelection(anchor, this.head());
    doc.pushChange({ type: 'moveSelection', text: removed, from: range.from, into: this.anchor() });
  }

  moveX(move, dontReverse = false) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveX(move): move should be a number!');
    }
    const { doc, anchor, head } = storage.get(this);
    const mv = dontReverse ? move : maybeReverseSelection(this, anchor, head, move);
    const position = positionAfterMove(doc, this.head(), mv);
    return this.setHead(position);
  }

  moveY(move) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveY(move): move should be a number!');
    }
    const { doc, anchor, head } = storage.get(this);
    const size = doc.size();
    let mv = maybeReverseSelection(this, anchor, head, move);

    mv = head.line + mv;
    if (mv < 0) {
      mv = head.column = 0;
    } else if (mv >= size) {
      head.column = -1;
      mv = size - 1;
    }
    return this.setHead(pos(mv, head.column));
  }

  offsets() {
    const store = storage.get(this);
    const measure = store.lastMeasure || { offsetX: 0, offsetY: 0, charHeight: 0 };

    return {
      offsetX: measure.offsetX,
      offsetY: measure.offsetY,
      totalOffsetY: measure.offsetY + measure.charHeight,
    };
  }

  position(position) {
    return this.clearSelection().setHead(position);
  }

  removeAfter(n) {
    const { doc, head } = storage.get(this);
    return docRemove(doc, this, rangeWithMove(doc, head, n));
  }

  removeBefore(n) {
    const { doc, head } = storage.get(this);
    return docRemove(doc, this, rangeWithMove(doc, head, -n));
  }

  removeLine() {
    const { doc, head } = storage.get(this);
    const r = range(pos(head.line, 0), pos(head.line, currentLine.text.length));
    return docRemove(doc, this, r);
  }

  removeSelection() {
    const range = this.getSelectionRange();
    if (range) {
      const { doc } = storage.get(this);
      this.clearSelection();
      doc.removeRange(range.from, range.to);
    }
  }

  reverse() {
    const store = storage.get(this);
    const oldAnchor = store.anchor;
    if (oldAnchor) {
      store.anchor = head;
      this.setHead(oldAnchor);
    }
    return this;
  }

  setHead(pos) {
    const { doc } = storage.get(this);
    const newHead = normalizePos(doc, pos);
    if (newHead) {
      const rect = doc.measureRect(doc.get(newHead.line), newHead.column);
      this.dispatch(rect);
    }
    return this;
  }

  setSelection(posA, posB) {
    const store = storage.get(this);
    const newAnchor = normalizePos(store.doc, posA);
    const newHead = normalizePos(store.doc, posB);

    if (newHead) {
      store.anchor = newAnchor && comparePos(newAnchor, newHead) ? newAnchor : null;
      this.setHead(newHead);
    }
    return this;
  }

  setSelectionRange(range) {
    return range && this.setSelection(range.from, range.to);
  }

  showSelection() {
    const range = this.getSelectionRange();
    const { currentLine, doc } = storage.get(this);

    if (range) {
      doc.selectionLayer.mark(this.id, range);
      unselect(this, currentLine);
    } else {
      doc.selectionLayer.clear(this.id);
      select(doc, this, currentLine);
    }
  }

  textAtCurrentLine() {
    const { currentLine } = storage.get(this);
    return currentLine && currentLine.text;
  }

  textAfter(length) {
    const { currentLine, head } = storage.get(this);
    return currentLine && currentLine.text.substr(head.column, length);
  }

  textBefore(length) {
    const { currentLine, head } = storage.get(this);
    return currentLine && currentLine.text.substring(length ? head.column - length : 0, head.column);
  }

  unwrapSelection(before, after) {
    const { doc } = storage.get(this);
    const range = this.getRange();
    const from = positionAfterMove(doc, range.from, -before.length);
    const to = positionAfterMove(doc, range.to, after.length);

    if (doc.substring(from, range.from) !== before || doc.substring(range.to, to) !== after) {
      return false;
    }
    removeRange(doc, range.to, to);
    removeRange(doc, from, range.from);
    doc.pushChange({ type: 'wrap', range, before, after, wrap: false });
  }

  updateStyle() {
    const { doc } = storage.get(this);
    this.style = doc.getOption('caretStyle') || 'vertical';
    this.node.className = `cp-caret cp-caret-${this.style}`;
  }

  wordBefore(rgx) {
    return this.match(rgx || /\w/, -1, false);
  }

  wordAfter(rgx) {
    return this.match(rgx || /\w/, 1, false);
  }

  wordAround(rgx) {
    return this.match(rgx || /\w/, 0, false);
  }

  wrapSelection(before, after) {
    const range = this.getRange();
    const { doc, anchor, head } = storage.get(this);

    replaceRange(doc, after, range.to, range.to);
    replaceRange(doc, before, range.from, range.from);

    if (anchor && comparePos(anchor, head) < 0) {
      this.moveX(-after.length, true) && this.moveAnchor(before.length);
    }
    doc.pushChange({ type: 'wrap', range, before, after, wrap: true });
  }
}

function setPixelPosition(doc, caret, measure) {
  if (!caret.isDisabled) {
    const css = Object.create(null);
    const { offsetX, offsetY } = measure;
    const options = doc.getOptions();

    if (offsetX >= 0) css.left = caret.x = offsetX;
    if (offsetY >= 0) css.top = caret.y = offsetY;

    caret.updateStyle(options.caretStyle);
    (CaretStyles[caret.style] || CaretStyles['vertical']).call(caret, css, measure, options);

    for (const key in css) {
      caret.node.style[key] = css[key] + (typeof css[key] === 'number' ? 'px' : '');
    }
  }
  return caret;
}

function select(doc, caret, line) {
  if (line && !line.active && doc.isFocused) {
    if (doc.getOption('highlightCurrentLine')) {
      line.addClass(activeClassName);
    }
    line.active = true;
  }
}

function unselect(caret, line) {
  if (line && line.active) {
    line.removeClass(activeClassName);
    line.active = undefined;
  }
}

export default Caret;
