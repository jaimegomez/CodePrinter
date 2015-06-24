
var startContent = '$(function() {\n  console.log("hello!");\n});'
, cp = new CodePrinter(startContent, {
  shortcuts: false
})
, doc = cp.doc;

document.body.appendChild(cp.mainNode);

describe('CodePrinter', function() {
  it('successfully initiated', function() {
    expect(doc.getValue()).toBe(startContent);
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
      expect(cp.caret.textBefore()).toBe('  cons');
    });
    it('returns textAfter', function() {
      expect(cp.caret.textAfter()).toBe('ole.log("hello!");');
    });
    it('should be moving', function() {
      cp.caret.moveX(18);
      expect(cp.caret.textAfter()).toBe('');
      expect(cp.caret.textBefore()).toBe('  console.log("hello!");');
    });
    it('should moved to start', function() {
      cp.caret.position(0, 0);
      expect(cp.caret.line()).toBe(0);
      expect(cp.caret.column()).toBe(0);
    });
  });
  
  it('should add new line', function() {
    cp.insertText('\n');
    expect(cp.doc.getValue()).toBe('\n'+startContent);
  });
  
  describe('Document', function() {
    it('should undo', function() {
      cp.doc.undo();
      expect(cp.doc.getValue()).toBe(startContent);
    });
    it('should redo', function() {
      cp.doc.redo();
      expect(cp.doc.getValue()).toBe('\n'+startContent);
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
