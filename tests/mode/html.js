
describe('HTML', function() {
  var content = "<!DOCTYPE html>\n<html>\n<head>\n<title>Hi there</title>\n</head>\n<body>\nThis is a page\na simple page\n";
  content += "<img src=\"unicorn_pic.png\" alt=\"Unicorn picture :)\" />\nnow with a unicorn &nbsp;\n</body>\n</html>\n";
  content += "<!-- content from https://developer.mozilla.org/en-US/Learn/HTML/Write_a_simple_page_in_HTML -->\n";
  
  var doc = cp.createDocument(content, 'HTML');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('should be prepared', function() {
    expect(cp.doc).toBe(doc);
    expect(doc.parser).toBeDefined();
    expect(doc.parser.name).toBe('HTML');
  });
  
  it('should reindent', function() {
    var indents = [
      0, 0, 1, 2, 1, 1, 2,
      2, 2, 2, 1, 0, 0
    ];
    
    cp.reIndent();
    for (var i = 0; i < indents.length; i++) {
      expect(cp.getIndentAtLine(i)).toBe(indents[i]);
    }
  });
  
  it('should recognize doctype', function() {
    var cache = cp.getStateAt(0, 1).cache;
    expect(cache.length).toBe(1);
    expect(cache[0].from).toBe(0);
    expect(cache[0].to).toBe(15);
    expect(cache[0].style).toBe('special doctype');
  });
  
  it('should recognize tags', function() {
    var positions = [
      [1, 5], [2, 7], [3, 8], [3, 26],
      [5, 5], [8, 7], [10, 6], [11, 3] 
    ];
    checkStyles(positions, 'keyword');
  });
  
  it('should recognize angle-brackets', function() {
    var positions = [
      [1, 1], [1, 6], [3, 27], [5, 8],
      [8, 58], [10, 3], [10, 4], [11, 7]
    ];
    checkStyles(positions, 'bracket');
  });
  
  it('should recognize attribute names', function() {
    var positions = [[8, 10], [8, 12], [8, 32], [8, 34]];
    checkStyles(positions, 'property');
  });
  
  it('should recognize attribute equal operators', function() {
    var positions = [[8, 13], [8, 35]];
    checkStyles(positions, 'operator');
  });
  
  it('should recognize attribute values', function() {
    var positions = [[8, 14], [8, 30], [8, 36], [8, 55]];
    checkStyles(positions, 'string');
  });
  
  it('should recognize entities', function() {
    checkStyles([[9, 29]], 'escaped');
  });
  
  it('should recognize comment', function() {
    var cache = cp.getStateAt(12, 10).cache;
    expect(cache.length).toBe(1);
    expect(cache[0].from).toBe(0);
    expect(cache[0].to).toBe(96);
    expect(cache[0].style).toBe('comment');
  });
});
