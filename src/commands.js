import { pos } from 'statics';
import { swap } from 'helpers/document';
import { duplicateCaretRange } from 'helpers/caret';

function moveCaret(fn, mv) {
  return function() {
    this.doc.call('clearSelection').call(fn, mv);
  };
}

function moveSelection(fn, mv) {
  return function() {
    this.doc.eachCaret(caret => {
      caret.hasSelection() || caret.beginSelection();
    });
    this.doc.call(fn, mv);
  };
}

function caretCmd(fn) {
  return function() {
    this.doc.eachCaret(fn);
  };
}

function moveWord(dir) {
  return caretCmd(caret => {
    const match = caret.match(/\w/, dir, false);
    caret.moveX(dir * Math.max(1, match.length));
  });
}

function posNegativeCols(doc, { line, column }) {
  return pos(line, column - doc.textAt(line).length - 1);
}

function rangeNegativeCols(doc, { from, to }) {
  return range(posNegativeCols(doc, from), posNegativeCols(doc, to));
}

function indent(caret) {
  const tabString = this.editor.getTabString();
  caret.eachLine((line, index) => singleInsert(this, line, index, tabString, 0));
  doc.pushChange({
    type: 'indent',
    range: rangeNegativeCols(doc, caret.getRange()),
    offset: 1
  });
}

function outdent(caret) {
  const tw = this.getOption('tabWidth');
  let success = false;
  caret.eachLine((line, index) => {
    const text = line.text;
    const min = Math.min(tw, text.length);
    let i = 0;
    for (; i < min && text.charAt(i) === ' '; i++);
    if (i === 0 && text.charAt(0) === '\t') i++;
    if (i > 0) {
      success = singleRemove(doc, line, index, 0, i) | true;
    }
  });
  if (success) {
    doc.pushChange({
      type: 'indent',
      range: rangeNegativeCols(doc, caret.getRange()),
      offset: -1
    });
  }
}

export default {
  moveCaretLeft: moveCaret('moveX', -1),
  moveCaretRight: moveCaret('moveX', 1),
  moveCaretUp: moveCaret('moveY', -1),
  moveCaretDown: moveCaret('moveY', 1),
  moveSelLeft: moveSelection('moveX', -1),
  moveSelRight: moveSelection('moveX', 1),
  moveSelUp: moveSelection('moveY', -1),
  moveSelDown: moveSelection('moveY', 1),
  moveToStart() {
    this.doc.resetCarets().setHead(pos(0, 0));
  },
  moveToEnd() {
    this.doc.resetCarets().setHead(pos(this.doc.size() - 1, -1));
  },
  moveToLineStart: caretCmd(caret => {
    caret.setHead(pos(caret.lineNumber(), 0));
  }),
  moveToLineEnd: caretCmd(caret => {
    caret.setHead(pos(caret.lineNumber(), -1));
  }),
  moveWordLeft: moveWord(-1),
  moveWordRight: moveWord(1),
  selectWord() {
    this.doc.call('match', /\w/);
  },
  selectLine: caretCmd(caret => {
    const head = caret.head();
    caret.setSelection(pos(head.line, 0), pos(head.line + 1, 0));
  }),
  selectAll() {
    const from = pos(this.doc.size(), -1);
    const to = pos(0, 0);
    this.doc.resetCarets().setSelection(from, to);
  },
  pageUp() {
    this.doc.call('moveY', -50);
  },
  pageDown() {
    this.doc.call('moveY', 50);
  },
  scrollToTop() {
    this.dom.scroll.scrollTop = 0;
  },
  scrollToBottom() {
    this.dom.scroll.scrollTop = this.dom.scroll.scrollHeight;
  },
  scrollToLeft() {
    this.dom.scroll.scrollLeft = 0;
  },
  scrollToRight() {
    this.dom.scroll.scrollLeft = this.dom.scroll.scrollWidth;
  },
  removeSelection() {
    this.doc.call('removeSelection');
  },
  indent: caretCmd(indent),
  outdent: caretCmd(outdent),
  reindent() {
    this.doc.reindent();
  },
  undo() {
    this.doc.undo();
  },
  redo() {
    this.doc.redo();
  },
  toNextDef() {},
  toPrevDef() {},
  swapUp: caretCmd(swap(true)),
  swapDown: caretCmd(swap(false)),
  duplicate: caretCmd(duplicateCaretRange),
  toggleLineNumbers() {
    this.setOption('lineNumbers', !this.getOption('lineNumbers'));
  },
  toggleIndentGuides() {
    this.setOption('drawIndentGuides', !this.getOption('drawIndentGuides'));
  },
  toggleMark: caretCmd(caret => {
    const line = caret.line();
    line.toggleMarked();
  }),
  toggleComment: caretCmd(caret => {
    var comment = this.parser.lineComment, add = leftTrim(caret.textAtCurrentLine()).indexOf(comment) !== 0;
    add ? caret.eachLine(addComment(this, comment)) : caret.eachLine(removeComment(this, comment));
  }),
  toggleBlockComment: caretCmd(caret => {
    var commentBegin = this.parser.blockCommentStart || '', commentEnd = this.parser.blockCommentEnd || ''
    , range = caret.getRange();
    if ((commentBegin || commentEnd) && range) {
      var first = this.get(range.from.line), last = this.get(range.to.line)
      , firstTrimmed = leftTrim(first.text), lastTrimmed = rightTrim(last.text)
      , fcol = first.text.length - firstTrimmed.length
      , i = firstTrimmed.indexOf(commentBegin), li = lastTrimmed.lastIndexOf(commentEnd);

      if (i >= 0 && li >= 0) {
        this.removeRange(pos(range.to.line, li), pos(range.to.line, li + commentEnd.length));
        this.removeRange(pos(range.from.line, fcol + i), pos(range.from.line, fcol + i + commentBegin.length));
      } else if (i === -1 && li === -1) {
        this.insertText(commentEnd, pos(range.to.line, lastTrimmed.length));
        this.insertText(commentBegin, pos(range.from.line, fcol));
      }
    }
  }),
  markSelection: caretCmd(caret => {
    const range = caret.getSelectionRange();
    range && this.markText(range.from, range.to, {
      strong: true
    });
  }),
  increaseFontSize() {
    this.setOption('fontSize', this.getOption('fontSize') + 1);
  },
  decreaseFontSize() {
    this.setOption('fontSize', this.getOption('fontSize') - 1);
  },
  prevSearchResult() {
    this.doc.searchPrevious();
  },
  nextSearchResult() {
    this.doc.searchNext();
  },
  searchEnd() {
    this.doc.searchEnd();
  },
  toNextDefinition() {
    var caret = this.doc.resetCarets(), dl = caret.dl().next();
    for (; dl; dl = dl.next()) {
      if (dl.definition) {
        caret.position(dl.getIndex(), dl.definition.pos);
        return;
      }
    }
  },
  toPrevDefinition() {
    var caret = this.doc.resetCarets(), dl = caret.dl().prev();
    for (; dl; dl = dl.prev()) {
      if (dl.definition) {
        caret.position(dl.getIndex(), dl.definition.pos);
        return;
      }
    }
  },
  delCharLeft() {
    var tw = this.getOption('tabWidth');
    this.doc.eachCaret(function(caret) {
      if (caret.hasSelection()) return caret.removeSelection();
      var bf = caret.textBefore(), m = bf.match(/^ +$/)
      , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
      caret.removeBefore(r);
    });
  },
  delCharRight() {
    var tw = this.getOption('tabWidth');
    this.doc.eachCaret(function(caret) {
      if (caret.hasSelection()) return caret.removeSelection();
      var af = caret.textAfter(), m = af.match(/^ +$/)
      , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
      caret.removeAfter(r);
    });
  },
  delWordLeft() {
    this.doc.call('match', /\w/, -1);
    this.doc.call('removeSelection');
  },
  delWordRight() {
    this.doc.call('match', /\w/, 1);
    this.doc.call('removeSelection');
  },
  delToLeft: caretCmd(caret => {
    caret.removeBefore(caret.column());
  }),
  delToRight: caretCmd(caret => {
    caret.removeAfter(caret.dl().text.length - caret.column());
  }),
  delLine: caretCmd(caret => {
    caret.removeLine();
  }),
  insertNewLine: caretCmd(caret => {
    var options = this.editor.getOptions(['autoIndent', 'tabWidth', 'indentByTabs']);
    if (options.autoIndent) {
      var head = caret.head()
      , ps = caret.getParserState()
      , indent = this.getIndent(head)
      , tw = options.tabWidth
      , tab = options.indentByTabs ? '\t' : repeat(' ', tw)
      , rest = '', mv = 0, tmp;

      if (ps.parser && ps.parser.indent) {
        var nextIndent = this.getNextLineIndent(head, true);
        if (nextIndent instanceof Array) {
          indent = nextIndent.shift();
          while (nextIndent.length) rest += '\n' + repeat(tab, indent + nextIndent.shift());
        } else if ('number' === typeof nextIndent) {
          indent = Math.max(0, nextIndent);
        }
      }
      tmp = parseIndentation(caret.textAfter(), tw);
      tab = repeat(tab, indent);
      if (tmp.indentText && tab.indexOf(tmp.indentText, tab.length - tmp.indentText.length) >= 0) tab = tab.slice(0, mv = -tmp.length);
      caret.insert('\n' + tab + rest, -rest.length - mv);
    } else {
      caret.insert('\n');
    }
  }),
  insertTab() {
    if (this.doc.somethingSelected()) {
      this.exec('indent');
    } else {
      var options = this.getOptions(['tabTriggers', 'indentByTabs', 'tabWidth']);
      this.doc.eachCaret(caret => {
        if (options.tabTriggers) {
          var head = caret.head(), bf = caret.match(/\S+/, -1, false), af = caret.match(/\S+/, 1, false), snippet;
          if (!af && (snippet = this.editor.findSnippet(bf, head))) {
            this.replaceRange(snippet.content, pos(head.line, head.column - bf.length), head);
            if ('number' === typeof snippet.cursorMove) caret.moveX(snippet.cursorMove);
            return false;
          }
        }
        caret.insert(options.indentByTabs ? '\t' : repeat(' ', options.tabWidth - caret.column() % options.tabWidth));
      });
    }
  },
  esc() {
    this.isFullscreen ? this.exitFullscreen() : this.doc.searchEnd();
  },
};
