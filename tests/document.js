
describe('Document', function() {
  
  beforeAll(function() {
    cp.setDocument(doc);
  });
  
  it('should be attached', function() {
    expect(cp.doc).toBe(doc);
  });
  
  var ins = 'insert some text ';
  var pos1 = generatePosition();
  
  it('should insert one-line text', function() {
    var line = lines[pos1.line];
    doc.replaceRange(ins, pos1);
    expect(doc.get(pos1.line).text).toBe(line.substring(0, pos1.column) + ins + line.substr(pos1.column));
  });
  
  it('should remove one-line text', function() {
    doc.removeRange(pos1, { line: pos1.line, column: pos1.column + ins.length });
    expect(doc.get(pos1.line).text).toBe(lines[pos1.line]);
  });
  
  var multiLineText = [
    "Cupcake ipsum dolor sit amet gingerbread. Cupcake ice cream gummies.",
    "Soufflé lemon drops powder.",
    "Bonbon marshmallow marshmallow dragée dessert macaroon marzipan dessert jujubes.",
    "Ice cream soufflé dragée halvah pastry carrot cake. Carrot cake biscuit croissant",
    "liquorice. Dragée biscuit ice cream marshmallow jelly beans."
  ].slice(0, 2 + Math.floor(Math.random() * 3));
  
  var pos2 = generatePosition();
  
  it('should insert multi-line text', function() {
    doc.replaceRange(multiLineText, pos2);
    expect(doc.get(pos2.line).text).toBe(lines[pos2.line].substring(0, pos2.column) + multiLineText[0]);
    for (var i = 1; i < multiLineText.length - 1; i++) {
      expect(doc.get(pos2.line + i).text).toBe(multiLineText[i]);
    }
    expect(doc.get(pos2.line + i).text).toBe(multiLineText[i] + lines[pos2.line].substr(pos2.column));
  });
  
  it('should remove multi-line text', function() {
    doc.removeRange(pos2, { line: pos2.line + multiLineText.length - 1, column: multiLineText[multiLineText.length-1].length });
    for (var i = 0; i < lines.length; i++) {
      expect(doc.get(i).text).toBe(lines[i]);
    }
  });
  
  var pos3 = pos2;
  var pos4 = generatePosition();
  var removedText;
  
  if ((pos3.line - pos4.line || pos3.column - pos4.column) > 0) {
    var tmp = pos3;
    pos3 = pos4;
    pos4 = tmp;
  }
  
  function replaceLinesTest() {
    var delta = pos4.line - pos3.line;
    var after = delta ? '' : lines[pos4.line].substr(pos4.column);
    expect(doc.get(pos3.line).text).toBe(lines[pos3.line].substring(0, pos3.column) + multiLineText[0]);
    for (var i = 1; i < multiLineText.length - 1; i++) {
      expect(doc.get(pos3.line + i).text).toBe(multiLineText[i]);
    }
    expect(doc.get(pos3.line + i).text).toBe(multiLineText[i] + lines[pos4.line].substr(pos4.column));
  }
  
  it('should replace multi-line text', function() {
    doc.replaceRange(multiLineText, pos3, pos4);
    replaceLinesTest();
  });
  
  it('should undo', function() {
    doc.undo();
    for (var i = 0; i < lines.length; i++) {
      expect(doc.get(i).text).toBe(lines[i]);
    }
    expect(doc.size()).toBe(lines.length);
  });
  
  it('should redo', function() {
    doc.redo();
    replaceLinesTest();
  });
  
  it('should undo all', function() {
    doc.undoAll();
    expect(doc.getValue()).toBe(lines.join('\n'));
  });
  
  it('could search by pattern', function(done) {
    doc.search(/\b\w\w\b/, function(results) {
      expect(results.length).toBe(13);
      results.each(function(searchNode) {
        expect(searchNode.value.length).toBe(2);
      });
      done();
    });
  });
  
  it('could search by string', function(done) {
    var dolorPos = [
      [0, 12],
      [1, 31],
      [3, 16],
      [3, 70]
    ];
    
    doc.search('dolor', function(results) {
      expect(results.length).toBe(4);
      results.each(function(searchNode, index, line) {
        expect(searchNode.value).toBe('dolor');
        expect(searchNode.line).toBe(dolorPos[index][0]);
        expect(searchNode.column).toBe(dolorPos[index][1]);
      });
      done();
    });
  });
  
  it('could replace found strings', function(done) {
    doc.replace('lorem'); // replace only active search node
    expect(doc.textAt(0)).toBe(lines[0].replace('dolor', 'lorem'));
    
    // changes in the document should trigger a new search
    doc.once('searchCompleted', function(results, request) {
      expect(results.length).toBe(3);
      expect(request).toBe('dolor');
      doc.replaceAll('ipsum');
      expect(doc.textAt(3)).toBe(lines[3].replace(/dolor/g, 'ipsum'));
      doc.searchEnd();
      doc.undoAll();
      done();
    });
  });
});
