describe('CSS', function() {
  var lines = [
    '* { margin: 0; padding: 0 }',
    'body {',
    'background-color: #eee;',
    'font-family: sans-serif;',
    'font-size: .9em;',
    '}',
    '.wrapper {',
    'width: 500px;',
    'background-color: white;',
    'margin: 0 auto;',
    'padding: 1em;',
    '}',
    '/* Block Level elements */',
    'h1, h2, h3, p, div, nav,',
    'article, header, footer, ul, li',
    '{',
    'background-color: #dddddd;',
    'margin-bottom: 5px;',
    '/*padding: 5px;',
    'width: 70%;*/',
    '}',
    'li {',
    'display:inline;',
    'height: 100px;',
    'width: 200px;',
    'margin: 0 20px;',
    'padding: 15px;',
    'background-color: #fff;',
    '',
    'blockquote {',
    'font-style: italic;',
    '}',
    '}',
    ''
  ];
  
  var doc = cp.createDocument(lines.join('\n'), 'CSS');
  
  beforeAll(function() {
    cp.setDocument(doc);
  });
  
  it('should be prepared', function() {
    expect(cp.doc).toBe(doc);
    expect(doc.parser).toBeDefined();
    expect(doc.parser.name).toBe('CSS');
  });
  
  it('should reindent', function() {
    var indents = [
      0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0,
      0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1,
      1, 1, 1, 1, 1, 1, 2, 1, 0, 0
    ];
    
    cp.exec('reIndent');
    for (var i = 0; i < indents.length; i++) {
      expect(doc.getIndent(i)).toBe(indents[i]);
    }
  });
  
  it('should recognize common tags and wildcard', function() {
    expect(doc.hasSymbolAt('keyword', [0, 1])).toBeTruthy();
    expect(doc.hasSymbolAt('keyword', [1, 4])).toBeTruthy();
    
    var cache = [].concat(doc.getState([13, 24]).cache, doc.getState([14, 31]).cache);
    
    for (var i = 0; i < cache.length; i++) {
      expect(cache[i].symbol).toBe('keyword');
    }
  });
  
  it('should recognize class names', function() {
    checkSymbols([[6, 8]], 'property');
  });
  
  it('should recognize css properties', function() {
    var positions = [
      [2, 18], [3, 13], [4, 11], [9, 8],
      [10, 9], [22, 9], [24, 7], [30, 14]
    ];
    checkSymbols(positions, 'special');
  });
  
  it('should recognize hex colors', function() {
    var positions = [[2, 24], [16, 24], [27, 24]];
    checkSymbols(positions, ['numeric', 'hex']);
  });
  
  it('should recognize comments', function() {
    var positions = [[12, 12], [18, 10], [19, 15]];
    checkSymbols(positions, 'comment');
  });
});
