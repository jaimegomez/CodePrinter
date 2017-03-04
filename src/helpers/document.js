import Flags from 'Flags';
import Parser from 'Parser';
import { EOL } from 'consts';
import LineView from 'LineView';
import { comparePos, normalizePos, pos } from 'statics';
import { each, eachRight, last, truthy, lineNumberFor } from 'helpers/index';

function adjustPositions(doc, change) {
  eachCaret(doc, caret => {
    const anchor = adjustPosForChange(caret.anchor(), change, true);
    const head = adjustPosForChange(caret.head(true), change);
    caret.setSelection(anchor, head);
  });
  // if (doc.markers) {
  //   var markers = doc.markers.items;
  //   for (var i = markers.length - 1; i >= 0; i--) {
  //     var marker = markers[i];
  //     if (marker.options.weak) marker.clear();
  //     else marker.update(adjustPosForChange(marker.from, change, true), adjustPosForChange(marker.to, change, true));
  //   }
  // }
}

export function adjustPosForChange(pos, change, anchor) {
  if (!pos) {
    return null;
  }
  const cmp = comparePos(pos, change.from);
  if (anchor ? cmp <= 0 : cmp < 0) {
    return pos;
  }
  if (comparePos(pos, change.to) <= 0) {
    return changeEnd(change);
  }
  const line = pos.line - change.to.line + change.from.line + change.text.length - 1;
  const column = pos.column + (pos.line === change.to.line ? changeEnd(change).column - change.to.column : 0);
  return { line, column };
}

export function changeEnd(change) {
  if (change.end) return change.end;
  if (!change.text) return change.from;
  const line = change.from.line + change.text.length - 1;
  const column = last(change.text).length + (change.text.length === 1 ? change.from.column : 0);
  return { line, column };
}

export function tokensHasFontStyle(tokens) {
  for (let j = 0, cl = tokens ? tokens.length : 0; j < cl; j++) {
    if (tokens[j].token.indexOf('font-') >= 0) {
      return true;
    }
  }
  return false;
}

export function eachCaret(doc, func, start) {
  return each(doc.carets, func, doc, start);
}

export function handleCaretMoved(caret, head, anchor) {
  eachRight(this.carets, cc => {
    if (cc !== caret && (cc.inSelection(head) || cc.inSelection(anchor))) {
      mergeCarets(caret, cc);
      removeCaret(this, cc);
      return false;
    }
  });
}

export function handleCaretUpdated(caret) {
  if (!Flags.mouseScrolling && this.isFocused && last(this.carets) === caret && this.getOption('autoScroll')) {
    const { left, top } = findProperScrollsForCaret(this, caret);
    this.scrollTo(left, top);
  }
  // if (this.getOption('matching')) {
  //   var matches = getMatches(this, caret, caret.getParserState().parser.matching);
  //   if (matches) {
  //     for (var i = 0; i < matches.length; i++) {
  //       this.markText(matches[i].from, matches[i].to, {
  //         className: 'cp-highlight',
  //         weak: true
  //       });
  //     }
  //   }
  // }
}

function findProperScroll(current, point, size, containerSize) {
  if (point < current + size) {
    return point - (point < current ? containerSize / 2 : size);
  }
  if (point + 2 * size >= current + containerSize) {
    return point - (point >= current + containerSize ? containerSize / 2 : containerSize - 2 * size);
  }
  return current;
}

function findProperScrollsForCaret(doc, caret) {
  const scroll = doc.dom.scroll;
  const height = caret.line().height;
  return {
    left: findProperScroll(scroll.scrollLeft, caret.x, 0, scroll.offsetWidth - doc.sizes.countersWidth),
    top: findProperScroll(scroll.scrollTop, caret.y, height, scroll.offsetHeight),
  };
}

export function replaceRange(doc, txt, posFrom, posTo) {
  const from = normalizePos(doc, posFrom);
  const to = normalizePos(doc, posTo || from);

  const text = typeof txt === 'string' ? txt.split(EOL) : Array.isArray(txt) ? txt : [''];

  if (!from) {
    return;
  }
  const removed = [];
  const first = doc.get(from.line);
  const delta = to.line - from.line;
  const after = delta ? doc.get(to.line).text.substr(to.column) : first.text.substr(to.column);

  let dl = first;
  let i = 0;

  removed[0] = delta ? first.text.substr(from.column) : first.text.substring(from.column, to.column);
  first.setText(first.text.substring(0, from.column) + text[0]);

  while (++i < delta && i < text.length && (dl = dl.next())) {
    removed[i] = dl.text;
    dl.setText(text[i]);
  }

  if (i < delta || i === delta && i === text.length) {
    const removedLines = doc.remove(from.line + i, delta - i + 1);
    for (let j = 0; j < removedLines.length - 1; j++) {
      removed[removed.length] = removedLines[j].text;
    }
    removed[removed.length] = last(removedLines).text.substring(0, to.column);
  } else if (i < text.length) {
    if (delta) {
      removed[removed.length] = (dl = dl.next()).text.substring(0, to.column);
      const inserted = doc.insert(from.line + i, text.slice(i, -1));
      dl.setText(last(text));
    } else {
      const inserted = doc.insert(from.line + i, text.slice(i));
      dl = last(inserted) || dl;
    }
  }
  dl.setText(dl.text + after);
  parseForward(doc, first);
  const change = { type: 'replace', text, removed, from, to };
  adjustPositions(doc, change);
  return change;
}

export function removeRange(doc, from, to) {
  return replaceRange(doc, '', from, to);
}

export function insertText(doc, text, at) {
  return replaceRange(doc, text, at, at);
}

export function findLineAndState(mode, line) {
  let tmp = line.prev(), prev = line;
  while (tmp) {
    if (tmp.state) {
      return { line: tmp.next(), state: tmp.state };
    }
    [prev, tmp] = [tmp, tmp.prev()];
  }
  return { line: prev, state: mode.initialState() };
}

export function getParseDefaults(doc, rest = {}) {
  return {
    mode: doc.mode,
    tabString: doc.editor.tabString,
    tabWidth: doc.getOption('tabWidth'),
    onIteration(task, token) {
      doc.emit('token', token, task);
    },
    ...rest,
  };
}

export function maybeAppendLineViews(doc, bottom, margin) {
  const view = doc.view;
  let line = view.lastLine().next();

  while (line && bottom < margin) {
    const lineView = view.push(new LineView());
    view.link(lineView, line);
    bottom += line.height;
    line = line.next(true);
  }
}

export function maybeUpdateCountersWidth(doc, force) {
  const last = lineNumberFor(doc.editor, doc.size() - 1);
  if (force || doc.editor.getOption('lineNumbers') && last.length !== doc.sizes.lastLineNumberLength) {
    const measure = doc.measure.node.firstChild;
    measure.firstChild.innerHTML = last;
    const width = measure.firstChild.offsetWidth;
    doc.sizes.lastLineNumberLength = last.length;
    updateCountersWidth(doc, width);
    return width;
  }
}

function mergeCarets(first, second) {
  const [h1, h2] = [first.head(), second.head()];
  const [a1, a2] = [first.anchor(), second.anchor()];
  const positions = [h1, h2, a1, a2].filter(truthy).sort(comparePos);

  if (positions[0] === h1 || positions[0] === h2) {
    first.setSelection(last(positions), positions[0]);
  } else {
    first.setSelection(positions[0], last(positions));
  }
}

export function realignHorizontally(doc) {
  const sl = doc.dom.scroll.scrollLeft;

  if (doc.editor.getOption('fixedLineNumbers')) {
    const cW = doc.sizes.countersWidth;
    const left = -cW + sl + 'px';
    const width = cW + 'px';

    doc.view.each(lineView => {
      const counter = lineView.counter;
      counter.parentNode.style.left = left;
      counter.style.width = width;
    });
  } else {
    doc.dom.counter.style.left = -sl + 'px';
  }
}

function removeCaret(doc, caret) {
  const index = doc.carets.indexOf(caret);
  doc.carets.splice(index, 1);
  doc.dom.caretsContainer.removeChild(caret.node);
  caret.clearSelection();
}

export function rewind(doc, st) {
  const line = doc.lineWithOffset(st - doc.editor.getOption('viewportMargin'));
  const lineIndex = line.getIndex();
  const view = doc.view;
  let codeScrollDelta = line.getOffset() - doc.sizes.scrollTop;
  let tmpLine = line;
  let i = -1;
  let popped;

  if (view.from <= lineIndex && lineIndex <= view.to) return false;

  while (tmpLine && ++i < view.children.length) {
    view.replaceLineInLineView(view.children[i], tmpLine, lineIndex + i);
    tmpLine = tmpLine.next(true);
  }
  view.from = lineIndex;
  view.to = view.from + i;
  if (i + 1 < view.length) {
    while (++i < view.length && (popped = view.scrollUp())) {
      codeScrollDelta -= popped.line.height;
    }
    while (i < view.length && (popped = view.pop())) {
      codeScrollDelta -= popped.line.height;
    }
  }
  view.to = view.from + view.length - 1;
  doc.dom.scroll.scrollTop = doc.scrollTop = st;
  scrollCodeTopMargin(doc, codeScrollDelta);
  doc.fill();
  return true;
}

export function scrollCodeTopMargin(doc, delta) {
  if (!delta) return;
  doc.sizes.scrollTop += delta;
  doc.dom.code.style.top = doc.sizes.scrollTop + 'px';
}

export function scrollDocument(doc, delta) {
  doc.scrollTop += delta;
  doc.dom.scroll.scrollTop += delta;
}

export function swap(up) {
  return function(caret) {
    const range = caret.getRange();
    const next = this.get(up ? range.from.line - 1 : range.to.line + 1);

    if (next) {
      const text = next.text;
      if (up) {
        const from = pos(range.from.line - 1, 0);
        const to = pos(range.from.line, 0);
        removeRange(this, from, to) && insertText(this, '\n' + text, pos(range.to.line - 1, -1));
      } else {
        const from = pos(range.to.line, -1);
        const to = pos(range.to.line + 1, -1);
        removeRange(this, from, to) && insertText(this, text + '\n', pos(range.from.line, 0));
      }
      this.pushChange({ type: 'swap', range, offset: up ? -1 : 1 });
    }
  }
}

export function updateCountersWidth(doc, width) {
  if (!doc) return;
  doc.sizes.countersWidth = width;
  doc.dom.counter.style.width = width + 'px';
  doc.dom.wrapper.style.marginLeft = width + 'px';
}

function parseForward(doc, line) {
  let stateBefore = line.state;
  let task = doc.parse(line);
  let tmp = line;

  while ((tmp = tmp.next()) && tmp.view && (tmp.tokens === null || Parser.stateChanged(stateBefore, task.state))) {
    tmp.tokens = undefined;
    stateBefore = tmp.state;
    task = doc.parse(line, task.state);
  }
  // if (line) {
  //   doc.parse(line, task.state);
  // }
  return tmp;
}
