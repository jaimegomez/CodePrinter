describe('JavaScript', function() {
  var lines = [
    'function factorial(n) {',
    'if (n === 0) {',
    'return 1;',
    '}',
    'return (n * factorial(n - 1));',
    '}',
    '',
    '     console.log(factorial(7)); // 5040'
  ];
  
  var doc = cp.createDocument(lines.join('\n'), 'JavaScript');
  
  beforeAll(function() {
    cp.setDocument(doc);
  });
  
  it('should reindent', function() {
    cp.exec('reindent');
    expect(cp.doc).toBe(doc);
    expect(doc.parser.name).toBe('javascript');
    expect(doc.getIndent(0)).toBe(0);
    expect(doc.getIndent(1)).toBe(1);
    expect(doc.getIndent(2)).toBe(2);
    expect(doc.getIndent(3)).toBe(1);
    expect(doc.getIndent(4)).toBe(1);
    expect(doc.getIndent(5)).toBe(0);
    expect(doc.getIndent(6)).toBe(0);
    expect(doc.getIndent(7)).toBe(0);
    expect(doc.getIndent(8)).toBe(0); // this line doesn't exist
  });
  
  it('should have correct contexts', function() {
    var parser = doc.parser;
    
    expect(doc.getState([0, 0]).state.context.type).toBe(parser.BLOCK_CONTEXT);
    expect(doc.getState([0, 19]).state.context.type).toBe(parser.FUNCTION_CONTEXT);
    expect(doc.getState([1, 3]).state.context.type).toBe(parser.FUNCTION_CONTEXT);
    expect(doc.getState([1, 16]).state.context.type).toBe(parser.BLOCK_CONTEXT);
    expect(doc.getState([3, 3]).state.context.type).toBe(parser.FUNCTION_CONTEXT);
    expect(doc.getState([4, 10]).state.context.type).toBe(parser.FAKE_CONTEXT);
    expect(doc.getState([4, 28]).state.context.type).toBe(parser.FAKE_CONTEXT);
    expect(doc.getState([4, 30]).state.context.type).toBe(parser.FAKE_CONTEXT);
    expect(doc.getState([4, 31]).state.context.type).toBe(parser.FUNCTION_CONTEXT);
    expect(doc.getState([5, 1]).state.context.type).toBe(parser.BLOCK_CONTEXT);
  });
  
  it('should recognize variables', function() {
    expect(doc.hasSymbolAt('parameter', [0, 20])).toBeTruthy();
    expect(doc.hasSymbolAt('variable', [1, 7])).toBeTruthy();
    expect(doc.hasSymbolAt('variable', [4, 25])).toBeTruthy();
  });
  
  it('should toggle comments', function() {
    doc.carets[0].position(2, 4);
    cp.exec('toggleComment');
    expect(doc.textAt(2)).toBe('    //return 1;');
    cp.exec('toggleComment');
    expect(doc.textAt(2)).toBe('    return 1;');
  });
  
  it('should toggle block comments', function() {
    doc.carets[0].setSelectionRange({ from: [1, 2], to: [3, 3] });
    cp.exec('toggleBlockComment');
    expect(doc.textAt(1)).toBe('  /*if (n === 0) {');
    expect(doc.hasSymbolAt('comment', [2, 7])).toBeTruthy();
    expect(doc.textAt(3)).toBe('  }*/');
    cp.exec('toggleBlockComment');
    expect(doc.hasSymbolAt('comment', [3, 2])).not.toBeTruthy();
    doc.carets[0].clearSelection();
  });
});
