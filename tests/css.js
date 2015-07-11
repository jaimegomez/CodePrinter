
describe('CSS', function() {
  var content = "* { margin: 0; padding: 0 }\nbody {\nbackground-color: #eee;\nfont-family: sans-serif;\nfont-size: .9em;\n}\n";
  content += ".wrapper {\nwidth: 500px;\nbackground-color: white;\nmargin: 0 auto;\npadding: 1em;\n}\n/* Block Level elements */\n";
  content += "h1, h2, h3, p, div, nav,\narticle, header, footer, ul, li\n{\nbackground-color: #dddddd;\nmargin-bottom: 5px;\n";
  content += "/*padding: 5px;\nwidth: 70%;*/\n}\nli {\ndisplay:inline;\nheight: 100px;\nwidth: 200px;\nmargin: 0 20px;\npadding: 15px;\n";
  content += "background-color: #fff;\n\nblockquote {\nfont-style: italic;\n}\n}\n";
  
  var doc = cp.createDocument(content, 'CSS');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('should be prepared', function() {
    expect(cp.doc).toBe(doc);
    expect(cp.doc.parser).toBeDefined();
    expect(cp.doc.parser.name).toBe('CSS');
  });
  
  it('should reindent', function() {
    var indents = [
      0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0,
      0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1,
      1, 1, 1, 1, 1, 1, 2, 1, 0, 0
    ];
    
    cp.reIndent();
    for (var i = 0; i < indents.length; i++) {
      expect(cp.getIndentAtLine(i)).toBe(indents[i]);
    }
  });
  
  it('should recognize common tags and wildcard', function() {
    expect(cp.getStateAt(0, 1).cache[0].style).toBe('keyword');
    expect(cp.getStateAt(1, 4).cache[0].style).toBe('keyword');
    
    var cache = [].concat(cp.getStateAt(13, 24).cache, cp.getStateAt(14, 31).cache);
    
    for (var i = 0; i < cache.length; i++) {
      expect(cache[i].style).toBe('keyword');
    }
  });
  
  it('should recognize class names', function() {
    checkStyles([[6, 8]], 'property');
  });
  
  it('should recognize css properties', function() {
    var positions = [
      [2, 18], [3, 13], [4, 11], [9, 8],
      [10, 9], [22, 9], [24, 7], [30, 14]
    ];
    checkStyles(positions, 'special');
  });
  
  it('should recognize hex colors', function() {
    var positions = [[2, 24], [16, 24], [27, 24]];
    checkStyles(positions, 'numeric hex');
  });
  
  it('should recognize comments', function() {
    var positions = [[12, 12], [18, 10], [19, 15]];
    checkStyles(positions, 'comment');
  });
});
