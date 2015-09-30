
describe('Commands', function() {
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  var caret;
  
  it('should select all content', function() {
    caret = doc.resetCarets();
    cp.exec('selectAll');
    var range = caret.getRange();
    
    expect(range.from.line).toBe(0);
    expect(range.from.column).toBe(0);
    expect(range.to.line).toBe(doc.size() - 1);
    expect(range.to.column).toBe(doc.textAt(doc.size() - 1).length);
    caret.clearSelection();
  });
  
  it('should swap lines', function() {
    var pos = generatePosition();
    if (pos.line === 0) pos.line = 1;
    
    caret.position(pos);
    cp.exec('swapUp');
    
    expect(caret.line()).toBe(pos.line - 1);
    expect(caret.column()).toBe(pos.column);
    expect(doc.textAt(pos.line - 1)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line)).toBe(lines[pos.line - 1]);
    
    cp.exec('undo');
    
    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line - 1)).toBe(lines[pos.line - 1]);
  });
  
  it('should duplicate lines', function() {
    var pos = generatePosition();
    caret.position(pos);
    cp.exec('duplicate');
    
    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line + 1)).toBe(lines[pos.line]);
    
    cp.exec('undo');
    
    expect(doc.textAt(pos.line)).toBe(lines[pos.line]);
    expect(doc.textAt(pos.line + 1)).toBe(lines[pos.line + 1]);
  });
});
