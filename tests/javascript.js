
describe('JavaScript', function() {
  var doc = cp.createDocument('function factorial(n) {\nif (n === 0) {\nreturn 1;\n}\nreturn (n * factorial(n - 1));\n}\n     console.log(factorial(7)); // 5040\n', 'JavaScript');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('should reindent', function() {
    cp.reIndent();
    expect(cp.doc).toBe(doc);
    expect(cp.doc.parser.name).toBe('JavaScript');
    expect(cp.getIndentAtLine(0)).toBe(0);
    expect(cp.getIndentAtLine(1)).toBe(1);
    expect(cp.getIndentAtLine(2)).toBe(2);
    expect(cp.getIndentAtLine(3)).toBe(1);
    expect(cp.getIndentAtLine(4)).toBe(1);
    expect(cp.getIndentAtLine(5)).toBe(0);
    expect(cp.getIndentAtLine(6)).toBe(0);
    expect(cp.getIndentAtLine(7)).toBe(0);
    expect(cp.getIndentAtLine(8)).toBe(0); // this line doesn't exist
  })
  
  it('should have correct contexts', function() {
    var FAKE_CONTEXT = 0
    , BLOCK_CONTEXT = 1
    , FUNCTION_CONTEXT = 3
    , ARROW_CONTEXT = 7
    , OBJECT_CONTEXT = 8
    , ARRAY_CONTEXT = 16
    , CLASS_CONTEXT = 32;
    
    expect(cp.getStateAt(0, 0).state.context.type).not.toBeDefined();
    expect(cp.getStateAt(0, 19).state.context.type).toBe(FUNCTION_CONTEXT);
    expect(cp.getStateAt(1, 3).state.context.type).toBe(FUNCTION_CONTEXT);
    expect(cp.getStateAt(1, 16).state.context.type).toBe(BLOCK_CONTEXT);
    expect(cp.getStateAt(3, 3).state.context.type).toBe(FUNCTION_CONTEXT);
    expect(cp.getStateAt(4, 10).state.context.type).toBe(FAKE_CONTEXT);
    expect(cp.getStateAt(4, 28).state.context.type).toBe(FAKE_CONTEXT);
    expect(cp.getStateAt(4, 30).state.context.type).toBe(FAKE_CONTEXT);
    expect(cp.getStateAt(4, 31).state.context.type).toBe(FUNCTION_CONTEXT);
    expect(cp.getStateAt(5, 1).state.context.type).not.toBeDefined();
  })
  
  it('should recognize variables', function() {
    expect(cp.getStateAt(0, 20).style).toContain('parameter');
    expect(cp.getStateAt(1, 7).style).toContain('variable');
    expect(cp.getStateAt(4, 25).style).toContain('variable');
  })
  
  it('should toggle comments', function() {
    cp.caret.position(2, 4);
    cp.toggleComment();
    expect(cp.getTextAtLine(2)).toBe('    //return 1;');
    cp.toggleComment();
    expect(cp.getTextAtLine(2)).toBe('    return 1;');
  })  
  
  it('should toggle block comments', function() {
    cp.doc.setSelectionRange(1, 2, 3, 3);
    cp.toggleBlockComment();
    expect(cp.getTextAtLine(1)).toBe('  /*if (n === 0) {');
    expect(cp.getStateAt(2, 7).style).toContain('comment');
    expect(cp.getTextAtLine(3)).toBe('  }*/');
    cp.toggleBlockComment();
    expect(cp.getStateAt(3, 2)).not.toContain('comment');
    cp.doc.clearSelection();
  })
})
