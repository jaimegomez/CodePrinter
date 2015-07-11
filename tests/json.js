
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
    
    var cache = cp.getStateAt(3, 11).cache[0];
    expect(cache.from).toBe(0);
    expect(cache.style).toBe('invalid');
    expect(cache.to).toBe(7);
    
    cp.removeBeforeCursor("'value'");
    cp.insertText('"value"');
  });
  
  it('should require double quotes in object keys', function() {
    cp.erase('"', 4, 5);
    cp.erase('"', 4, 10);
    
    var cache = cp.getStateAt(4, 9).cache[0];
    expect(cache.from).toBe(0);
    expect(cache.to).toBe(5);
    expect(cache.style).toBe('invalid');
    
    cp.put('"', 4, 4);
    cp.put('"', 4, 10);
  });
});
