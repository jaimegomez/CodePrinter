
var cp = new CodePrinter('', { shortcuts: false, height: 1000 });
document.body.appendChild(cp.mainNode);

window.checkStyles = function(positions, style) {
  for (var i = 0; i < positions.length; i++) {
    expect(cp.getStateAt(positions[i][0], positions[i][1]).style).toBe(style);
  }
}

describe('CodePrinter', function() {
  var lines = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod",
    "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
    "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu",
    "fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa",
    "qui officia deserunt mollit anim id est laborum."
  ];
  
  var content = lines.join('\n');
  
  doc = cp.createDocument(content, 'plaintext');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('successfully initiated', function() {
    expect(cp.doc.getValue()).toBe(content);
  });
  it('should get focus', function() {
    cp.focus();
    expect(cp.input).toBe(document.activeElement);
  });
  
  describe('Caret', function() {
    it('sets position', function() {
      cp.caret.position(1, 6);
      expect(cp.caret.line()).toBe(1);
      expect(cp.caret.column()).toBe(6);
    });
    it('returns textBefore', function() {
      expect(cp.caret.textBefore()).toBe(lines[1].substring(0, 6));
    });
    it('returns textAfter', function() {
      expect(cp.caret.textAfter()).toBe(lines[1].substr(6));
    });
    it('should be moving', function() {
      cp.caret.moveX(18);
      expect(cp.caret.textAfter()).toBe(lines[1].substr(24));
      expect(cp.caret.textBefore()).toBe(lines[1].substring(0, 24));
    });
    it('should moved to start', function() {
      cp.caret.position(0, 0);
      expect(cp.caret.line()).toBe(0);
      expect(cp.caret.column()).toBe(0);
    });
  });
  
  it('should add new line', function() {
    var size = doc.size(), height = doc.height();
    cp.caret.position(5, -1);
    cp.insertText('\n');
    expect(cp.doc.getValue()).toBe(content + '\n');
    expect(doc.size()).toBe(size + 1);
    expect(doc.height()).toBeGreaterThan(height);
    cp.removeBeforeCursor(1);
    expect(doc.size()).toBe(size);
    expect(doc.height()).toBe(height);
  });
  
  it('should swap lines', function() {
    cp.caret.position(2, 5);
    cp.swapLineUp();
    expect(cp.getTextAtLine(1)).toBe(lines[2]);
    expect(cp.getTextAtLine(2)).toBe(lines[1]);
    cp.swapLineDown();
    expect(cp.getTextAtLine(1)).toBe(lines[1]);
    expect(cp.getTextAtLine(2)).toBe(lines[2]);
    expect(cp.caret.line()).toBe(2);
    expect(cp.caret.column()).toBe(5);
  });
  
  describe('Document', function() {
    it('should undo', function() {
      cp.caret.position(3, 62);
      cp.removeBeforeCursor('esse');
      cp.doc.undo();
      expect(cp.doc.getValue()).toBe(content);
    });
    it('should redo', function() {
      cp.doc.redo();
      expect(cp.getTextAtLine(3)).toBe(lines[3].substring(0, 58) + lines[3].substr(62));
      cp.insertText('esse');
      expect(cp.doc.getValue()).toBe(content);
    });
    it('should detach', function() {
      cp.doc.detach();
      expect(cp.doc).toBeNull();
      expect(cp.code.childNodes.length).toBe(0);
    });
    it('should attach', function() {
      cp.setDocument(doc);
      expect(cp.doc).toBe(doc);
      expect(cp.code.childNodes.length).toBe(doc.view.length);
    });
    it('should clear', function() {
      cp.doc.clear();
      expect(cp.doc.getValue()).toBe('');
    });
  });
});

afterEach(function(done) {
  setTimeout(function() {
    done();
  }, 30);
});
