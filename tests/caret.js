import { pos, onewayRange } from 'statics';
import { doc, generatePosition, lines, reset } from 'helpers/tests';

describe('Caret', () => {
  const toInsert = '...';
  let caret;

  beforeAll(() => {
    reset();
    caret = cp.doc.resetCarets();
  });

  it('should change the position', () => {
    const pos = generatePosition();
    caret.position(pos);

    expect(caret.lineNumber()).toBe(pos.line);
    expect(caret.column()).toBe(pos.column);
  });

  it('should select text', () => {
    const anchor = generatePosition();
    const head = generatePosition();
    caret.setSelection(anchor, head);

    expect(caret.hasSelection()).toBe(true);
    expect(caret.getSelectionRange()).toEqual(onewayRange(anchor, head));
    expect(caret.anchor()).toEqual(anchor);
    expect(caret.head()).toEqual(head);
  });

  it('should insert text', () => {
    caret.position(generatePosition());
    caret.insert(toInsert);

    expect(caret.textBefore().slice(-toInsert.length)).toBe(toInsert);
  });

  it('should remove inserted text', () => {
    const removed = caret.removeBefore(toInsert.length);

    expect(removed[0]).toBe(toInsert);
    expect(caret.textAtCurrentLine()).toBe(lines[caret.lineNumber()]);
  });

  it('should wrap selection', () => {
    caret.setSelection(generatePosition(), generatePosition());
    const selection = caret.getSelection();

    caret.wrapSelection('{', '}');
    const { from, to } = caret.getRange();

    expect(caret.getSelection()).toBe(selection);
    expect(doc.textAt(pos(from.line, from.column - 1))).toBe('{');
    expect(doc.textAt(to)).toBe('}');
  });

  it('should unwrap selection', () => {
    caret.unwrapSelection('{', '}');
    expect(doc.getValue()).toBe(lines.join('\n'));
  });

  it('should clear the selection', () => {
    caret.clearSelection();

    expect(caret.hasSelection()).toBe(false);
    expect(caret.anchor()).toBeNull();
  });

  it('should move selection', () => {
    const ps = [generatePosition(), generatePosition(), generatePosition()].sort((a, b) => {
      return a.line - b.line || a.column - b.column;
    });

    caret.setSelection(ps[0], ps[1]);
    const sel = doc.getSelection();
    caret.moveSelectionTo(ps[2]);

    expect(doc.getSelection()).toBe(sel);
    doc.undo();
    expect(doc.getSelection()).toBe(sel);
    expect(doc.getValue()).toBe(lines.join('\n'));
    caret.clearSelection();
  });
});
