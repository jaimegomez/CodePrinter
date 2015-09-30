
describe('Caret', function() {
  
  var caret = doc.resetCarets();
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  var toInsert = '...';
  
  it('should change the position', function() {
    var pos = generatePosition();
    caret.position(pos);
    
    expect(caret.line()).toBe(pos.line);
    expect(caret.column()).toBe(pos.column);
  });
  
  it('should select text', function() {
    var anchor = generatePosition(), head = generatePosition();
    caret.setSelection(anchor, head);
    
    expect(caret.hasSelection()).toBeTruthy();
    expect(caret.getSelectionRange()).toBeTruthy();
    expect(caret.anchor().line).toBe(anchor.line);
    expect(caret.head().line).toBe(head.line);
  });
  
  it('should clear the selection', function() {
    caret.clearSelection();
    
    expect(caret.hasSelection()).toBeFalsy();
    expect(caret.anchor()).toBeFalsy();
  });
  
  it('should insert text', function() {
    caret.position(generatePosition());
    caret.insert(toInsert);
    
    expect(caret.textBefore().slice(-toInsert.length)).toBe(toInsert);
  });
  
  it('should remove inserted text', function() {
    var removed = caret.removeBefore(toInsert.length);
    
    expect(removed[0]).toBe(toInsert);
    expect(caret.textAtCurrentLine()).toBe(lines[caret.line()]);
  });
  
  it('should wrap selection', function() {
    caret.setSelection(generatePosition(), generatePosition());
    caret.wrapSelection('{', '}');
    var range = caret.getRange();
    
    expect(doc.textAt(range.from.line).charAt(range.from.column - 1)).toBe('{');
    expect(doc.textAt(range.to.line).charAt(range.to.column)).toBe('}');
  });
  
  it('should unwrap selection', function() {
    caret.unwrapSelection('{', '}');
    caret.clearSelection();
    expect(doc.getValue('\n')).toBe(content);
  });
  
  it('should move selection', function() {
    var ps = [generatePosition(), generatePosition(), generatePosition()].sort(function(a, b) { return a.line - b.line || a.column - b.column; });
    
    caret.setSelection(ps[0], ps[1]);
    var sel = doc.getSelection();
    caret.moveSelectionTo(ps[2]);
    
    expect(doc.getSelection()).toBe(sel);
    doc.undo();
    expect(doc.getSelection()).toBe(sel);
    expect(doc.getValue()).toBe(content);
    caret.clearSelection();
  });
});
