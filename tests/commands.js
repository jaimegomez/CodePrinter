import { pos } from 'statics';
import { LINE_MARKED_CLASSNAME } from 'consts';
import { lines, generatePosition, reset } from 'helpers/tests';

describe('Commands', () => {
  const doc = cp.doc;
  let caret;

  function testCaretMove(commandName, lineMove, columnMove) {
    const position = pos(3, 6);

    caret.position(position);
    cp.exec(commandName);

    const head = caret.head();
    expect(head.line).toBe(position.line + lineMove);
    expect(head.column).toBe(position.column + columnMove);
  }

  beforeAll(() => {
    reset();
    caret = doc.carets[0];
  });

  it('should select whole document', () => {
    cp.exec('selectAll');

    const range = caret.getRange();

    expect(range.from.line).toBe(0);
    expect(range.from.column).toBe(0);
    expect(range.to.line).toBe(doc.size() - 1);
    expect(range.to.column).toBe(doc.textAt(doc.size() - 1).length);
    caret.clearSelection();
  });

  it('should move caret one column left', () => {
    testCaretMove('moveCaretLeft', 0, -1);
  });

  it('should move caret one column right', () => {
    testCaretMove('moveCaretRight', 0, 1);
  });

  it('should move caret one line up', () => {
    testCaretMove('moveCaretUp', -1, 0);
  });

  it('should move caret one line down', () => {
    testCaretMove('moveCaretDown', 1, 0);
  });

  it('should move to start', () => {
    cp.exec('moveToStart');
    const head = caret.head();
    expect(head.line).toBe(0);
    expect(head.column).toBe(0);
  });

  it('should move to end', () => {
    cp.exec('moveToEnd');
    const head = caret.head();
    expect(head.line).toBe(doc.size() - 1);
    expect(head.column).toBe(lines[head.line].length);
  });

  it('should move to line start', () => {
    const position = generatePosition();
    caret.position(position);
    cp.exec('moveToLineStart');

    expect(caret.lineNumber()).toBe(position.line);
    expect(caret.column()).toBe(0);
  });

  it('should move to line end', () => {
    const position = generatePosition();
    caret.position(position);
    cp.exec('moveToLineEnd');

    expect(caret.lineNumber()).toBe(position.line);
    expect(caret.column()).toBe(lines[position.line].length);
  });

  it('should select whole line', () => {
    const position = generatePosition();
    caret.position(position);
    cp.exec('selectLine');

    expect(caret.getSelection()).toBe(lines[position.line] + '\n');
  });

  it('should swap lines', () => {
    const pos = generatePosition();

    if (pos.line === 0) {
      pos.line = 1;
    }

    caret.position(pos);
    cp.exec('swapUp');

    expect(caret.lineNumber()).toBe(pos.line - 1);
    expect(caret.column()).toBe(pos.column);
    expect(doc.textAt(pos.line - 1)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line)).toBe(lines[pos.line - 1]);

    cp.exec('undo');

    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line - 1)).toBe(lines[pos.line - 1]);
  });

  it('should duplicate lines', () => {
    const pos = generatePosition();

    caret.position(pos);
    cp.exec('duplicate');

    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line + 1)).toBe(lines[pos.line]);

    cp.exec('undo');

    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line + 1)).toBe(lines[pos.line + 1]);
  });

  it('can toggle line numbers', () => {
    const lineNumbers = cp.getOption('lineNumbers');
    const counterNode = cp.dom.counter;

    cp.exec('toggleLineNumbers');
    expect(cp.getOption('lineNumbers')).toBe(!lineNumbers);
    expect(counterNode.classList.contains('cp-hidden')).toBe(lineNumbers);

    cp.exec('toggleLineNumbers');
    expect(cp.getOption('lineNumbers')).toBe(lineNumbers);
    expect(counterNode.classList.contains('cp-hidden')).toBe(!lineNumbers);
  });

  it('can toggle line marked', () => {
    const line = caret.line();
    const node = line.view.node;
    const marked = line.hasClass(LINE_MARKED_CLASSNAME);

    cp.exec('toggleMark');
    expect(line.hasClass(LINE_MARKED_CLASSNAME)).toBe(!marked);
    expect(node.classList.contains(LINE_MARKED_CLASSNAME)).toBe(!marked);

    cp.exec('toggleMark');
    expect(line.hasClass(LINE_MARKED_CLASSNAME)).toBe(marked);
    expect(node.classList.contains(LINE_MARKED_CLASSNAME)).toBe(marked);
  });
});
