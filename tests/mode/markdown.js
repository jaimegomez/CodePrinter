
describe('Markdown', function() {
  var content = "It's very easy to make some words **bold** and other words *italic* with Markdown.\nYou can even [link to Google!](http://google.com)\n";
  content += "![Image of Yaktocat](https://octodex.github.com/images/yaktocat.png)\n";
  content += "# Structured documents\n### This is a third-tier heading\n";
  content += "> Coffee. The finest organic suspension ever devised... I beat the Borg with it.\n";
  content += "> - Captain Janeway\n";
  content += "1. One\n2. Two\n3. Three\n";
  content += "* Start a line with a star\n* Profit!\n";
  
  var doc = cp.createDocument(content, 'Markdown');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('should recognize bold text', function() {
    expect(cp.getStateAt(0, 35).style).not.toContain('bold');
    expect(cp.getStateAt(0, 37).style).toContain('bold');
    expect(cp.getStateAt(0, 40).style).toContain('bold');
    expect(cp.getStateAt(0, 41).style).not.toContain('bold');
  });
  
  it('should recognize italic text', function() {
    expect(cp.getStateAt(0, 59).style).not.toContain('italic');
    expect(cp.getStateAt(0, 61).style).toContain('italic');
    expect(cp.getStateAt(0, 63).style).toContain('italic');
    expect(cp.getStateAt(0, 67).style).not.toContain('italic');
  });
  
  it('should recognize links', function() {
    expect(cp.getStateAt(1, 20).style).toBe('string');
    expect(cp.getStateAt(1, 39).style).toBe('special');
    expect(cp.getStateAt(1, 49).style).toBe('bracket');
  });
  
  it('should recognize images', function() {
    expect(cp.getStateAt(2, 1).style).toBe('directive');
    expect(cp.getStateAt(2, 19).style).toBe('string');
    expect(cp.getStateAt(2, 34).style).toBe('special');
    expect(cp.getStateAt(2, 68).style).toBe('bracket');
  });
  
  it('should recognize headers', function() {
    var a = cp.getStateAt(3, 1).style, b = cp.getStateAt(4, 32).style;
    expect(a).toContain('font-160');
    expect(a).toContain('namespace');
    expect(b).toContain('font-140');
    expect(b).toContain('namespace');
  });
  
  it('should insert next point in the ordered list', function() {
    cp.caret.position(8, 6);
    cp.call('Enter');
    expect(cp.getTextAtLine(9)).toBe('3. ');
  });
  
  it('should insert next point in the unordered list', function() {
    cp.caret.position(12, 9);
    cp.call('Enter');
    expect(cp.getTextAtLine(13)).toBe('* ');
  });
});