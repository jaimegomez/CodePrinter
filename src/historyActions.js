import { copy } from 'helpers/index';
import { comparePos, range } from 'statics';
import { adjustPosForChange, changeEnd, swap } from 'helpers/document';

function mergeStringArrays(a, b) {
  a[a.length-1] += b.shift();
  return a.concat(b);
}

function moveRangeBy(range, line, col) {
  if (line) { range.from.line += line; range.to.line += line; }
  if (col) { range.from.column += col; range.to.column += col; }
  return range;
}

export default {
  'replace': {
    make(caret, change) {
      caret.setSelection(change.from, change.to).insert(change.text).clearSelection();
    },
    reverse(change) {
      return { type: 'replace', text: change.removed, removed: change.text, from: change.from, to: changeEnd(change) };
    },
    canBeMerged(a, b) {
      if (comparePos(changeEnd(a), b.from) === 0) {
        return 1;
      }
      return comparePos(a.from, changeEnd({ text: b.removed, from: b.from })) === 0 ? 2 : 0;
    },
    merge(a, b, code) {
      var x = a, y = b;
      if (code === 2) {
        x = b; y = a;
        a.from = b.from;
      }
      a.text = mergeStringArrays(x.text, y.text);
      a.removed = mergeStringArrays(x.removed, y.removed);
      a.to = changeEnd({ text: x.removed, from: x.from });
    }
  },
  'indent': {
    make(caret, change) {
      caret.setSelectionRange(change.range);
      (change.offset > 0 ? indent : outdent).call(this, caret);
    },
    reverse(change) {
      return { ...change, offset: -change.offset };
    },
    canBeMerged(a, b) {
      return a.offset + b.offset && a.range.from.line === b.range.from.line && a.range.to.line === b.range.to.line;
    },
    merge(a, b) {
      a.offset += b.offset;
      a.range = b.range;
    },
    split(a) {
      if (a.offset === 1 || a.offset === -1) return a;
      a.offset > 1 ? --a.offset : ++a.offset;
      return { type: 'indent', range: a.range, offset: a.offset > 0 ? 1 : -1 };
    }
  },
  'setIndent': {
    make(change) {
      this.setIndent(change.line, change.after);
    },
    reverse(change) {
      return { ...change, before: change.after, after: change.before };
    }
  },
  'wrap': {
    make(caret, change) {
      var method = change.wrap ? 'wrapSelection' : 'unwrapSelection';
      caret.setSelection(change.range.from, change.range.to)[method](change.before, change.after);
    },
    reverse(change) {
      if (change.wrap) {
        var ch = { text: [change.before], from: change.range.from, to: change.range.from };
      } else {
        var ch = { text: [''], from: moveRangeBy(copy(change.range), 0, -change.before.length).from, to: change.range.from };
      }
      change.range = range(adjustPosForChange(change.range.from, ch), adjustPosForChange(change.range.to, ch));
      return { ...change, wrap: !change.wrap };
    }
  },
  'moveSelection': {
    make(caret, change) {
      caret.setSelection(change.from, changeEnd(change)).moveSelectionTo(change.into);
    },
    reverse(change) {
      return { ...change, from: change.into, into: change.from };
    }
  },
  'swap': {
    make(caret, change) {
      caret.setSelectionRange(change.range);
      swap(change.offset < 0).call(this, caret);
    },
    reverse(change) {
      moveRangeBy(change.range, change.offset);
      return { ...change, offset: -change.offset };
    },
    canBeMerged(a, b) {
      var off = a.offset;
      return a.range.from.column === b.range.from.column && a.range.to.column === b.range.to.column
      && a.range.from.line + off === b.range.from.line && a.range.to.line + off === b.range.to.line;
    },
    merge(a, b) {
      a.offset += b.offset;
    },
    split(a) {
      if (a.offset === 1 || a.offset === -1) return a;
      var r = copy(a.range);
      moveRangeBy(r, a.offset > 1 ? a.offset-- : a.offset++);
      return { type: 'swap', range: r, offset: a.offset > 0 ? -1 : 1 };
    }
  }
};
