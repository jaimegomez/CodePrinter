import Flags from 'Flags';
import { copy } from 'helpers/index';
import { pos, comparePos, range } from 'statics';

export function docRemove(doc, caret, removeRange) {
  const range = caret.getSelectionRange() || removeRange;
  if (range) {
    return doc.removeRange(range.from, range.to);
  }
}

export function duplicateCaretRange(caret) {
  const range = caret.getRange();
  const text = this.substring(pos(range.from.line, 0), pos(range.to.line, -1));
  caret.position(pos(range.to.line, -1)).insert('\n' + text);
}

function findWordTest(pattern) {
  return function(ch) {
    return typeof pattern === 'function' ? pattern(ch) : pattern.test ? pattern.test(ch) : false;
  };
}

export function findWord(at, text, pattern = /\w/, dir = 0) {
  const test = findWordTest(pattern);
  let left = at.column;
  let right = at.column;
  let ch;

  if (dir >= 0) {
    for (; (ch = text.charAt(right)) && test(ch); ++right);
  }
  if (dir <= 0) {
    for (; (ch = text.charAt(left - 1)) && test(ch); --left);
  }
  return {
    word: text.substring(left, right),
    before: text.substring(0, left),
    after: text.substr(right),
    from: pos(at.line, left),
    to: pos(at.line, right),
    target: at
  };
}

export function maybeReverseSelection(caret, anchor, head, move) {
  if (!caret.hasSelection() || Flags.shiftKey) {
    return move;
  }
  const cmp = comparePos(anchor, head);
  if (cmp < 0 && move < 0 || cmp > 0 && move > 0) {
    caret.reverse();
    return move - cmp;
  }
  return move;
}

export function positionAfterMove(doc, position, move) {
  const p = copy(position);
  let dl = doc.get(p.line);
  let mv = move;

  if (mv <= 0) {
    while (dl) {
      if (-mv <= p.column) {
        p.column += mv;
        return p;
      }
      mv += p.column + 1;
      if (dl = dl.prev()) {
        p.column = dl.text.length;
        --p.line;
      }
    }
  } else {
    while (dl) {
      if (p.column + mv <= dl.text.length) {
        p.column += mv;
        return p;
      }
      mv -= dl.text.length - p.column + 1;
      if (dl = dl.next()) {
        p.column = 0;
        ++p.line;
      }
    }
  }
  return p;
}

export function rangeWithMove(doc, pos, move) {
  const afterMove = positionAfterMove(doc, pos, move);
  return move <= 0 ? range(afterMove, pos) : range(pos, afterMove);
}
