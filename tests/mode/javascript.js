describe('JavaScript', function() {
  var lines = [
    'function factorial(n) {',
    'if (n === 0) {',
    'return 1;',
    '}',
    'return (n * factorial(n - 1));',
    '}',
    '',
    '     console.log(factorial(7)); // 5040',
    '             {',
    '  function tag(strings, ...values) {',
    'return "Bazinga!";',
    '}',
    'let a = 5;',
    'const b = 10;',
    ' tag`Hello ${a + b} + ${"world" + b} ${a * b}!\\n`;',
    '{',
    '    let arrow = (a, ...b, c) => b.concat(a, c);',
    '}',
    '}',
    '',
  ];

  var doc = cp.createDocument(lines.join('\n'), 'JavaScript');

  beforeAll(function() {
    cp.setDocument(doc);
  });

  it('should be initiated', function() {
    expect(cp.doc).toBe(doc);
    expect(doc.parser.name).toBe('javascript');
  });

  it('should reindent', function() {
    var indents = [
      0, 1, 2, 1, 1, 0, 0, 0, 0, 1,
      2, 1, 1, 1, 1, 1, 2, 1, 0, 0
    ];
    cp.exec('reindent');
    for (var i = 0; i < indents.length; i++) {
      expect(doc.getIndent(i)).toBe(indents[i]);
    }
    expect(doc.getIndent(lines.length)).toBe(0); // this line doesn't exist
  });

  it('should have correct contexts', function() {
    var parser = doc.parser;
    var data = [
      [0, 0, parser.BLOCK_CONTEXT],
      [0, 19, parser.FUNCTION_CONTEXT],
      [1, 3, parser.FUNCTION_CONTEXT],
      [1, 16, parser.BLOCK_CONTEXT],
      [3, 3, parser.FUNCTION_CONTEXT],
      [4, 10, parser.FAKE_CONTEXT],
      [4, 28, parser.FAKE_CONTEXT],
      [4, 30, parser.FAKE_CONTEXT],
      [4, 31, parser.FUNCTION_CONTEXT],
      [5, 1, parser.BLOCK_CONTEXT],
      [8, 1, parser.BLOCK_CONTEXT],
      [10, 11, parser.FUNCTION_CONTEXT],
      [15, 3, parser.BLOCK_CONTEXT],
      [16, 32, parser.ARROW_CONTEXT],
      [16, 47, parser.BLOCK_CONTEXT],
    ];

    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      expect(doc.getState([item[0], item[1]]).state.context.type).toBe(item[2]);
    }
  });

  it('should recognize variables', function() {
    expect(doc.hasSymbolAt('variable', [1, 7])).toBeTruthy();
    expect(doc.hasSymbolAt('variable', [4, 25])).toBeTruthy();
    expect(doc.hasSymbolAt('variable', [14, 15])).toBeTruthy();
    expect(doc.hasSymbolAt('variable', [14, 41])).toBeTruthy();
  });

  it('should recognize function parameters', function() {
    expect(doc.hasSymbolAt('parameter', [0, 20])).toBeTruthy();
    expect(doc.hasSymbolAt('parameter', [9, 22])).toBeTruthy();
    expect(doc.hasSymbolAt('parameter', [9, 30])).toBeTruthy();
    expect(doc.hasSymbolAt('parameter', [16, 24])).toBeTruthy();
    expect(doc.hasSymbolAt('parameter', [16, 27])).toBeTruthy();
  });

  it('should recognize constants', function() {
    expect(doc.hasSymbolAt('constant', [13, 9])).toBeTruthy();
    expect(doc.hasSymbolAt('constant', [14, 19])).toBeTruthy();
    expect(doc.hasSymbolAt('constant', [14, 36])).toBeTruthy();
    expect(doc.hasSymbolAt('constant', [14, 45])).toBeTruthy();
  });

  it('should detect template strings', function() {
    expect(doc.hasSymbolAt('string', [14, 6])).toBeTruthy();
    expect(doc.hasSymbolAt('string', [14, 28])).toBeTruthy();
    expect(doc.hasSymbolAt('string', [14, 34])).toBeFalsy();
    expect(doc.hasSymbolAt('string', [14, 51])).toBeFalsy();
  });

  it('should detect escaped characters in template strings', function() {
    expect(doc.hasSymbolAt('escaped', [14, 48])).toBeTruthy();
    expect(doc.hasSymbolAt('escaped', [14, 49])).toBeTruthy();
  });

  it('should recognize functions and their parameters', function() {
    var tagFunctionState = doc.getState([9, 36]).state;
    expect(tagFunctionState.context.name).toBe('tag');
    expect('strings' in tagFunctionState.context.params).toBeTruthy();
    expect('values' in tagFunctionState.context.params).toBeTruthy();
  });

  it('should recognize arrow functions and their parameters', function() {
    var arrowState = doc.getState([16, 32]).state;
    expect('a' in arrowState.context.params).toBeTruthy();
    expect('b' in arrowState.context.params).toBeTruthy();
    expect('c' in arrowState.context.params).toBeTruthy();
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
