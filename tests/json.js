
describe('JSON', function() {
  var content = '{\n"menu": {\n"id": "file",\n"value": "File",\n"popup": {\n';
  content += '"menuitem": [\n{"value": "New", "onclick": "CreateNewDoc()"},\n';
  content += '{"value": "Open", "onclick": "OpenDoc()"},\n{"value": "Close", ';
  content += '"onclick": "CloseDoc()"}\n]\n}\n}\n}\n';
  
  var doc = cp.createDocument(content, 'JSON');
  
  beforeEach(function() {
    cp.setDocument(doc);
  });
  
  it('should re-indent', function() {
    var arr = [0, 1, 2, 2, 2, 3, 4, 4, 4, 3, 2, 1, 0, 0];
    cp.reIndent();
    for (var i = 0; i < 14; i++) {
      expect(cp.getIndentAtLine(i)).toBe(arr[i]);
    }
  });
  
  it('should mark single quotes as invalid', function() {
    cp.caret.position(3, 4);
    cp.removeAfterCursor('"value"');
    cp.insertText("'value'");
    var cache = cp.getStateAt(3, 11).cache;
    expect(cache[0].from).toBe(0);
    expect(cache[0].style).toBe('invalid');
    expect(cache[1].to).toBe(6);
    expect(cache[1].style).toBe('invalid');
    expect(cache[2].to).toBe(7);
    expect(cache[2].style).toBe('invalid');
    cp.removeBeforeCursor("'value'");
    cp.insertText('"value"');
  });
  
  it('should require double quotes in object keys', function() {
    cp.caret.position(4, 4);
    cp.removeAfterCursor('"');
    var cache = cp.getStateAt(4, 13).cache[0];
    expect(cache.from).toBe(0);
    expect(cache.to).toBe(5);
    expect(cache.style).toBe('invalid');
    cp.insertText('"');
  });
});
