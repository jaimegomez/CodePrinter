import { lines, generatePosition, reset } from 'helpers/tests';

describe('Document', () => {
  const text = lines.slice(0, 2 + Math.floor(Math.random() * 3));
  const doc = cp.doc;
  let documentValue;

  beforeAll(reset);

  it('should be initialized', () => {
    expect(cp.doc).toBe(doc);
    expect(doc.getValue()).toBe(lines.join('\n'));
  });

  it('should insert & remove one-line text', () => {
    const pos = generatePosition();
    const insertText = 'insert some text ';
    const line = doc.get(pos.line);
    const previousText = line.text;

    doc.replaceRange(insertText, pos);
    expect(line.text).toBe(previousText.substring(0, pos.column) + insertText + previousText.substr(pos.column));

    doc.removeRange(pos, { line: pos.line, column: pos.column + insertText.length });
    expect(line.text).toBe(previousText);
  });

  it('should insert & remove multi-line text', () => {
    const pos = generatePosition();

    doc.replaceRange(text, pos);
    expect(doc.textAt(pos.line)).toBe(lines[pos.line].substring(0, pos.column) + text[0]);

    for (let i = 1; i < text.length; i++) {
      const right = i === text.length - 1 ? lines[pos.line].substr(pos.column) : '';
      expect(doc.textAt(pos.line + i)).toBe(text[i] + right);
    }

    doc.removeRange(pos, { line: pos.line + text.length - 1, column: text[text.length - 1].length });
    for (let i = 0; i < lines.length; i++) {
      expect(doc.textAt(i)).toBe(lines[i]);
    }
  });

  it('should replace multi-line text', () => {
    let pos1 = generatePosition();
    let pos2 = generatePosition();

    if ((pos1.line - pos2.line || pos1.column - pos2.column) > 0) {
      [pos1, pos2] = [pos2, pos1];
    }

    doc.replaceRange(text, pos1, pos2);

    const delta = pos2.line - pos1.line;
    const after = delta ? '' : lines[pos2.line].substr(pos2.column);

    expect(doc.textAt(pos1.line)).toBe(lines[pos1.line].substring(0, pos1.column) + text[0]);

    for (let i = 1; i < text.length; i++) {
      const right = i === text.length - 1 ? lines[pos2.line].substr(pos2.column) : '';
      expect(doc.textAt(pos1.line + i)).toBe(text[i] + right);
    }
  });

  it('should undo', () => {
    documentValue = doc.getValue();
    doc.undo();
    for (let i = 0; i < lines.length; i++) {
      expect(doc.textAt(i)).toBe(lines[i]);
    }
    expect(doc.size()).toBe(lines.length);
  });

  it('should redo', () => {
    doc.redo();
    expect(doc.getValue()).toBe(documentValue);
  });

  it('should undo all', () => {
    doc.undoAll();
    expect(doc.getValue()).toBe(lines.join('\n'));
  });

  xit('could search by pattern', function(done) {
    doc.search(/\b\w\w\b/, function(results) {
      expect(results.length).toBe(13);
      results.each(function(searchNode) {
        expect(searchNode.value.length).toBe(2);
      });
      done();
    });
  });

  xit('could search by string', function(done) {
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

  xit('could replace found strings', function(done) {
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
