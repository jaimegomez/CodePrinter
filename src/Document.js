import View from 'View';
import Line from 'Line';
import Mode from 'Mode';
import Caret from 'Caret';
import Flags from 'Flags';
import Parser from 'Parser';
import History from 'History';
import Overlay from 'Overlay';
import LineView from 'LineView';
import { EOL, ZWS } from 'consts';
import LinesTree from 'LinesTree';
import aliases from 'data/aliases';
import EventEmitter from 'EventEmitter';
import { getHistoryAction } from 'helpers/history';
import { measurePosition, measureRect } from 'helpers/measurement';
import { comparePos, normalizePos, onewayRange, isPos } from 'statics';
import { addLayer, createLayer, mountLayers, removeLayer, unmountLayers } from 'helpers/layers';

import {
  addClass,
  arrayRemove,
  clearLine,
  computeCodeReserve,
  createNode,
  defaultFormatter,
  eachRight,
  isArray,
  schedule,
  updateFontSizes,
} from 'helpers/index';

import {
  findLineAndState,
  getParseDefaults,
  handleCaretMoved,
  handleCaretUpdated,
  maybeAppendLineViews,
  maybeUpdateCountersWidth,
  realignHorizontally,
  replaceRange,
  rewind,
  scrollCodeTopMargin,
  scrollDocument,
  tokensHasFontStyle,
  updateCountersWidth,
} from 'helpers/document';

const storage = new WeakMap();
// WeakMap { [document] => { data, history }}
// storage for document's private data

class Document extends EventEmitter {
  static attach(editor, doc, focus) {
    const dom = doc.dom = editor.dom;
    const { layers } = storage.get(doc);

    doc.editor = editor;
    editor.doc = doc;
    doc.propagateTo(editor);
    updateFontSizes(editor, doc);
    dom.measure.appendChild(doc.measure.node);
    doc.view.mount(dom.code, dom.counter);
    mountLayers(doc, layers);
    doc.scrollTo(doc.scrollLeft | 0, doc.scrollTop | 0);
    doc.fill();
    updateScroll(doc);
    applySizes(doc);
    if (focus) doc.focus();
    doc.emit('attached');
  }

  static detach(editor, doc) {
    const dom = doc.dom;
    const { layers } = storage.get(doc);

    doc.scrollTop = dom.scroll.scrollTop;
    doc.scrollLeft = dom.scroll.scrollLeft;
    doc.view.unmount();
    unmountLayers(doc, layers);
    dom.measure.removeChild(doc.measure.node);
    doc.blur();
    editor.doc = doc.editor = null;
    doc.emit('detached');
    doc.propagateTo(null);
  }

  constructor(source, mode, font) {
    super();

    storage.set(this, {
      history: new History(this),
      layers: new Set(),
      selectionLayer: null,
    });

    this.sizes = {
      scrollTop: 0,
      font: font || {},
      paddingTop: 5,
      paddingLeft: 10,
      countersWidth: 30,
      lastLineNumberLength: 1
    };
    this.from = 0;
    this.to = -1;
    this.view = new View(this);
    this.measure = new LineView();
    this.carets = [new Caret(this)];
    this.scrollTop = this.scrollLeft = 0;
    this.mode = CodePrinter.getMode(mode) || CodePrinter.getMode('plaintext');
    this.linkedDocs = [];

    this.on('caretMoved', handleCaretMoved);
    this.on('caretUpdated', handleCaretUpdated);

    return this.init(source, mode);
  }

  get selectionLayer() {
    const store = storage.get(this);
    if (!store.selectionLayer) {
      store.selectionLayer = this.createLayer('cp-selection-layer');
    }
    return store.selectionLayer;
  }

  addLayer(layer) {
    const { layers } = storage.get(this);
    return addLayer(this, layers, layer);
  }

  blur() {
    if (this.isFocused) {
      clearInterval(this.caretsBlinkingInterval);
      this.isFocused = false;
      this.eachCaret(caret => {
        caret.blur();
        this.dom.caretsContainer.removeChild(caret.node);
      });
      this.emit('blur');
    }
  }

  call(method, ...args) {
    this.eachCaret(caret => {
      const func = caret[method];
      if (typeof func === 'function') {
        func.apply(caret, args);
      }
    });
    return this;
  }

  clear() {
    const { data } = storage.get(this);
    data.size = data.height = 0;
    data.children.length = 0;
  }

  createCaret() {
    const caret = new Caret(this);
    this.carets.push(caret);
    if (this.isFocused) {
      this.dom.caretsContainer.appendChild(caret.node);
    }
    return caret;
  }

  createLayer(...args) {
    return createLayer(this, args);
  }

  createReadStream() {
    const transform = this.getOption('trimTrailingSpaces') ? rightTrim : defaultFormatter;
    return new ReadStream(this, transform);
  }

  each(func) {
    const { data } = storage.get(this);
    data.forEach(func);
  }

  eachCaret(func, startIndex) {
    const { history } = storage.get(this);
    history.stage();
    eachRight(this.carets, func, this, startIndex);
    history.commit();
    return this;
  }

  eachLinkedDoc(func) {
    eachRight(this.linkedDocs, func, this);
  }

  eachVisibleLines(func) {
    const { view } = this;
    for (let i = 0; i < view.length; i++) {
      func.call(this, view[i].line, view.from + i);
    }
  }

  fill() {
    const { view, editor } = this;

    if (!editor) {
      return null;
    }

    let dl = view.length ? view.lastLine().next() : this.get(0);
    let topMargin = this.scrollTop - this.sizes.scrollTop;
    let bottomMargin = computeCodeReserve(this) - topMargin;
    const margin = editor.getOption('viewportMargin');
    const oldTopMargin = topMargin;

    if (bottomMargin < margin) {
      while (dl && bottomMargin < margin) {
        const lv = view.push(new LineView());
        view.link(lv, dl);
        bottomMargin += dl.height;
        dl = lv.tail().next(true);
      }
    } else {
      while (bottomMargin - this.sizes.font.height > margin) {
        const popped = view.pop();
        bottomMargin -= popped.line.height;
      }
    }
    if (dl && topMargin < margin) {
      dl = view.firstLine().prev(true);
      while (dl && topMargin < margin) {
        const lv = view.unshift(new LineView());
        view.link(lv, dl);
        topMargin += dl.height;
        dl = dl.prev(true);
      }
    } else {
      while (topMargin - this.sizes.font.height > margin) {
        const shifted = view.shift();
        topMargin -= shifted.line.height;
      }
    }
    if (oldTopMargin !== topMargin) {
      scrollCodeTopMargin(this, oldTopMargin - topMargin);
    }
    return this;
  }

  findCaretAt({ line, column }, boundary = true) {
    for (const caret of this.carets) {
      if (caret.inSelection({ line, column }, boundary)) {
        return caret;
      }
    }
  }

  focus() {
    if (!this.isFocused) {
      this.isFocused = true;
      startBlinking(this, this.getOptions());
      this.eachCaret(caret => {
        this.dom.caretsContainer.appendChild(caret.node);
        caret.focus();
      });
      this.emit('focus');
    }
  }

  get(i) {
    const { data } = storage.get(this);
    return data.get(i);
  }

  getOption(key) {
    return this.editor && this.editor.getOption(key);
  }

  getOptions(pick) {
    return this.editor && this.editor.getOptions(pick);
  }

  getSelection() {
    const parts = [];
    const carets = [...this.carets];
    carets.map(caret => caret.head()).sort(comparePos);
    for (const caret of carets) {
      const selection = caret.getSelection();
      if (selection) {
        parts.push(selection);
      }
    }
    return parts.join('');
  }

  getState(pos) {
    const line = pos && this.get(pos.line);

    if (!line || !this.editor) {
      return null;
    }

    const previousLine = line.prev();
    const state = previousLine ? previousLine.state : this.mode.initialState();
    const options = getParseDefaults(this, {
      lineIndex: pos.line,
      end: pos.column,
    });
    return Parser.parse(line.text, state, options);
  }

  getValue(lineEnding) {
    const r = [];
    const transform = this.getOption('trimTrailingSpaces') ? rightTrim : defaultFormatter;
    const joiner = lineEnding || this.getOption('lineEnding') || '\n';
    this.each((line, index) => (r[index] = transform(line.text)));
    return r.join(joiner);
  }

  height() {
    const { data } = storage.get(this);
    return data.height;
  }

  init(source, mode) {
    const store = storage.get(this);
    const data = new LinesTree();
    // if (this.view.to !== -1) clearDoc(this);
    if (store.data) {
      this.scrollTo(0, 0);
    }

    store.data = data;
    this.insert(0, source);
    mode && this.setMode(mode);
    return this;
  }

  insert(at, text = '') {
    const store = storage.get(this);
    const textLines = isArray(text) ? text : text.split(EOL);
    const fontHeight = this.sizes.font.height;
    const lines = textLines.map(textLine => {
      const line = new Line(textLine, fontHeight);
      if (textLine.length > store.maxLineLength) {
        store.maxLine = line;
        store.maxLineLength = textLine.length;
        store.maxLineChanged = true;
      }
      return line;
    });

    store.data.insert(at, lines);

    if (this.editor) {
      const view = this.view;
      let scrollDelta;

      if (at < view.from) {
        view.from += lines.length;
        view.to += lines.length;
        scrollDelta = this.sizes.font.height * lines.length;
      } else if (at <= view.to + 1) {
        scrollDelta = view.render(lines[0], at - view.from);
      }
      scrollCodeTopMargin(this, scrollDelta);
      this.fill();
      this.updateView();
    }
    return lines;
  }

  insertText(...args) {
    return this.replaceRange(...args);
  }

  isEmpty() {
    return this.size() === 1 && !this.get(0).text;
  }

  isLineVisible(dl) {
    const { view } = this;
    const line = typeof dl === 'number' ? this.get(dl) : dl;
    return view.indexOf(line) >= 0;
  }

  lineWithOffset(offset) {
    const { data } = storage.get(this);
    return data.getLineWithOffset(Math.max(0, Math.min(offset, data.height)));
  }

  makeCarets(n) {
    if (typeof n !== 'number') {
      throw new TypeError('makeCarets: first argument should be a number!');
    }
    if (n > this.carets.length) this.carets.length = n;
    else for (; this.carets.length < n;) this.createCaret();
  }

  makeChange(change, reverse) {
    if (this.pushingChanges) {
      return;
    }
    const arr = isArray(change) ? change : [change];
    this.resetCarets();
    for (let i = arr.length - 1, j = 0; i >= 0; i--) {
      if (reverse) {
        arr[i] = reverseChange(arr[i]);
      }
      const action = getHistoryAction(arr[i].type);
      if (action) {
        if (action.make.length > 1) {
          action.make.call(this, j ? this.createCaret() : this.carets[j++], arr[i]);
        } else {
          action.make.call(this, arr[i]);
        }
      }
    }
    return this;
  }

  measurePosition(x, y) {
    return measurePosition(this, x, y);
  }

  measureRect(line, offset, to) {
    return measureRect(this, line, offset, to);
  }

  parse(line, state) {
    const start = state ? { line, state } : findLineAndState(this.mode, line);
    let tmp = start.line, tmpState = start.state;

    for (; tmp; tmp = tmp.next()) {
      const opts = getParseDefaults(this, {
        lineIndex: tmp.getIndex(),
      });
      const task = Parser.parse(tmp.text, tmpState, opts);

      tmp.state = tmpState = task.state;
      tmp.tokens = task.tokens;
      tmp.text = task.stream.value; // use transformed text
      tmp.updateView();

      if (tmp === line) {
        return task;
      }
    }
    return null;
  }

  print() {
    const { sizes, dom } = this;
    this.fill();
    this.updateView();
    runBackgroundParser(this, true);
    sizes.paddingTop = parseInt(dom.screen.style.paddingTop, 10) || 5;
    sizes.paddingLeft = parseInt(dom.screen.style.paddingLeft, 10) || 10;
    schedule(() => cp && cp.emit('ready'));
  }

  process(line) {
    line.tokens ? line.updateView() : this.parse(line);
  }

  pushChange(change) {
    if (!change || this.pushingChanges) {
      return;
    }
    const { history } = storage.get(this);
    this.pushingChanges = true;
    history.push(change);
    runBackgroundParser(this);
    this.emit('changed', change);
    this.eachLinkedDoc(doc => doc.makeChange(change));
    this.pushingChanges = false;
    return change;
  }

  redo() {
    const { history } = storage.get(this);
    return history.redo();
  }

  redoAll() {
    while (this.redo());
  }

  remove(at, n) {
    const { data } = storage.get(this);

    if (typeof n !== 'number' || n <= 0 || at < 0 || at + n > data.size) {
      return;
    }
    const view = this.view;
    const h = data.height;
    const rm = data.remove(at, n);
    let sd = 0;

    if (at + n < view.from) {
      // handle change above the viewport
      sd = data.height - h;
      view.from -= n;
      view.to -= n;
    } else if (at <= view.to) {
      // handle change within the viewport
      const max = Math.max(view.from, at);
      const m = max - at;
      const firstLineView = rm[m].view;
      const i = view.indexOf(firstLineView);
      const next = data.get(at);

      for (let j = 0; j < m; j++) {
        sd -= rm[j].height;
      }
      view.from -= m;
      view.to -= m;
      sd += view.render(next, i);
    }
    if (sd) {
      scrollCodeTopMargin(this, sd);
      this.scroll(0, sd);
    }
    this.updateView();
    return rm;
  }

  removeLayer(layer) {
    const { layers } = storage.get(this);
    return removeLayer(this, layers, layer);
  }

  removeRange(from, to) {
    return this.replaceRange('', from, to);
  }

  replaceRange(text, from, to) {
    const change = replaceRange(this, text, from, to);
    if (change) {
      this.pushChange(change);
      return change.removed;
    }
  }

  reset() {
    let line = this.get(0);
    if (line) {
      do { clearLine(line); }
      while (line = line.next());
    }
  }

  resetCarets(all) {
    const startIndex = all ? 0 : 1;
    this.eachCaret(caret => {
      caret.clearSelection();
      caret.blur();
      this.dom.caretsContainer.removeChild(caret.node);
    }, startIndex);
    this.carets.length = startIndex;
    return this.carets[0];
  }

  scheduledEach(onEach) {
    const queue = 1000;
    let line = this.get(0);
    let index = 0;

    const fn = () => {
      let j = 0;
      while (line && j++ < queue) {
        line = onEach.call(this, line, index++) === false ? false : line.next();
      }
      return line ? schedule(fn) : null;
    };
    return schedule(fn);
  }

  scroll(deltaX, deltaY) {
    const scroll = this.dom.scroll;

    if (deltaX) {
      const sl = Math.max(0, Math.min(this.scrollLeft + deltaX, scroll.scrollWidth - scroll.offsetWidth));

      if (this.scrollLeft !== sl) {
        this._lockedScrolling = true;
        this.dom.scroll.scrollLeft = this.scrollLeft = sl;
        realignHorizontally(this);
      }
    }
    if (deltaY) {
      const st = Math.max(0, Math.min(this.scrollTop + deltaY, scroll.scrollHeight - scroll.offsetHeight));

      if (this.scrollTop !== st) {
        this._lockedScrolling = true;

        let top = this.scrollTop + deltaY - this.sizes.scrollTop;
        const margin = this.editor.getOption('viewportMargin');
        const view = this.view;
        const oldTop = top;

        if ((deltaY < -200 || 200 < deltaY) && rewind(this, st) !== false) {
          return;
        }

        if (deltaY > 0) {
          if (top < margin) {
            maybeAppendLineViews(this, computeCodeReserve(this) - top, margin);
          } else {
            let shifted;
            while (top > margin && (shifted = view.scrollDown())) {
              top -= shifted.line.height;
            }
          }
        }
        else if (deltaY < 0) {
          const bottom = computeCodeReserve(this) - top;
          if (top > margin) {
            maybeAppendLineViews(this, bottom, margin);
          } else {
            let popped;
            while (top < margin && (popped = view.scrollUp())) {
              top += popped.line.height;
            }
          }
        }
        scroll.scrollTop = this.scrollTop = st;
        if (oldTop !== top) {
          scrollCodeTopMargin(this, oldTop - top);
        }
      }
    }
  }

  scrollTo(sl, st) {
    return this.scroll(Math.round(sl - this.scrollLeft), Math.round(st - this.scrollTop));
  }

  search(search, scroll = false) {
    // TODO
  }

  setMode(modeName) {
    return CodePrinter.requireMode(modeName)
      .then(mode => {
        const newMode = mode instanceof Mode ? mode : CodePrinter.getMode('plaintext');
        if (this.mode !== newMode) {
          this.reset();
          this.mode = newMode;
          this.emit('modeChanged', newMode);
          this.editor && this.print();
          return newMode;
        }
        return null;
      })
      .catch(error => {
        console.error(error.stack);
        return null;
      });
  }

  size() {
    const { data } = storage.get(this);
    return data.size;
  }

  somethingSelected() {
    for (const caret of this.carets)
      if (caret.hasSelection())
        return true;
    return false;
  }

  substring(a, b) {
    const from = normalizePos(this, a);
    const to = normalizePos(this, b);
    if (!from || !to || comparePos(from, to) > 0) {
      return '';
    }

    const line = this.get(from.line);
    if (from.line === to.line) {
      return line.text.substring(from.column, to.column);
    }
    const parts = [line.text.substr(from.column)];
    let i = from.line;
    let tmp = line;
    while ((tmp = tmp.next()) && ++i < to.line) {
      parts.push(tmp.text);
    }
    if (tmp) {
      parts.push(tmp.text.substring(0, to.column));
    }
    return parts.join(this.getOption('lineEnding') || '\n');
  }

  textAt(at) {
    if (typeof at === 'number') {
      const line = this.get(at);
      return line ? line.text : null;
    }
    if (isPos(at)) {
      const line = this.get(at.line);
      return line ? line.text.charAt(at.column) : null;
    }
    if (at && at.from && at.to) {
      const { from, to } = onewayRange(at.from, at.to);
      return this.substring(from, to);
    }
  }

  updateView(forceCountersWidth) {
    if (!this.dom.mainNode.parentNode) {
      return;
    }
    const view = this.view;
    const lines = view.children;
    const cw = maybeUpdateCountersWidth(this, forceCountersWidth);

    for (let i = 0, lv = lines[i]; i < view.length; lv = lines[++i]) {
      view.setCounter(lv, view.from + i, cw);
      if (lv.change) {
        this.process(lv.line);
      }
      if (this.sizes.font.height !== lv.line.height || tokensHasFontStyle(lv.line.tokens)) {
        updateLineHeight(this, lv.line);
      }
    }
    const store = storage.get(this);
    if (store.maxLineChanged) {
      if (!store.maxLine) {
        const dl = data.get(0);
        store.maxLine = dl;
        store.maxLineLength = dl.text.length;

        while (dl = dl.next()) {
          if (dl.text.length > store.maxLineLength) {
            store.maxLine = dl;
            store.maxLineLength = dl.text.length;
          }
        }
      }
      store.maxLineChanged = false;
      const minWidth = externalMeasure(this, maxLine).pre.offsetWidth;
      if (this.sizes.minWidth !== minWidth) {
        this.dom.screen.style.minWidth = (this.sizes.minWidth = minWidth) + 'px';
      }
    }
    updateHeight(this);
    return this.emit('viewUpdated');
  }

  undo() {
    const { history } = storage.get(this);
    return history.undo();
  }

  undoAll() {
    while (this.undo());
  }
}

function applySizes(doc) {
  const { dom, sizes } = doc;
  if (!sizes.minHeight) {
    updateHeight(doc);
  } else {
    dom.wrapper.style.minHeight = sizes.minHeight + 'px';
  }
  updateCountersWidth(doc, doc.sizes.countersWidth);
  dom.screen.style.minWidth = sizes.minWidth + 'px';
  dom.scroll.scrollTop = doc.scrollTop | 0;
  dom.scroll.scrollLeft = doc.scrollLeft | 0;
}

function runBackgroundParser(doc, whole) {
  if (doc.parsing === true) {
    return;
  }
  console.time('parse');
  // console.profile('parse');
  let state = doc.mode.initialState();
  const to = whole ? doc.size() - 1 : doc.view.to;
  const onEach = (line, index) => {
    if (index > to) return false;
    doc.parse(line, state);
    state = line.state;
  };

  doc.parsing = true;
  doc.scheduledEach(onEach).then(() => {
    doc.parsing = false;
    console.timeEnd('parse');
    // console.profileEnd('parse');
  });
}

function startBlinking(doc, options) {
  clearInterval(doc.caretsBlinkingInterval);

  if (options.blinkCaret) {
    const container = doc.dom.caretsContainer;
    let v = true;

    if (options.caretBlinkRate > 0) {
      container.style.visibility = '';
      doc.caretsBlinkingInterval = setInterval(() => {
        let tick = (v = !v) ? '' : 'hidden';
        if (Flags.isKeyDown || Flags.isMouseDown) {
          tick = '';
          v = true;
        }
        container.style.visibility = tick;
      }, options.caretBlinkRate);
    } else if (options.caretBlinkRate < 0) {
      container.style.visibility = 'hidden';
    }
  }
}

function updateHeight(doc) {
  const minHeight = doc.height() + 2 * doc.sizes.paddingTop;
  const dom = doc.dom;
  if (dom && doc.sizes.minHeight !== minHeight) {
    dom.wrapper.style.minHeight = minHeight + 'px';
    doc.sizes.minHeight = minHeight;
  }
}

function updateScroll(doc) {
  if (doc.view.length) {
    const o = doc.view.firstLine().getOffset();
    doc.dom.code.style.top = (doc.sizes.scrollTop = o) + 'px';
  }
}

export default Document;
