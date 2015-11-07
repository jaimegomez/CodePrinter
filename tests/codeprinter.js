
var lines = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod",
  "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,",
  "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu",
  "fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa",
  "qui officia deserunt mollit anim id est laborum."
];
var content = lines.join('\n');
var cp = new CodePrinter(content, { shortcuts: false, height: 1000, mode: 'plaintext', hints: true });
var doc = cp.doc;

document.body.appendChild(cp.dom.mainNode);

function generatePosition() {
  var pos = {};
  pos.line = Math.floor(Math.random() * (lines.length - 1));
  pos.column = Math.floor(Math.random() * (lines[pos.line].length - 1));
  return pos;
}

function checkSymbols(positions, symbols) {
  for (var i = 0; i < positions.length; i++) {
    expect(cp.doc.hasSymbolAt(symbols, positions[i])).toBeTruthy();
  }
}

describe('CodePrinter', function() {
  beforeAll(function(done) {
    cp.setDocument(doc);
    if (cp.dom.mainNode.parentNode) done();
    else cp.on('inserted', function() {
      done();
    });
  });
  
  it('should be initialized', function() {
    expect(cp.doc.getValue()).toBe(content);
  });
  
  it('should get focus', function() {
    cp.focus();
    expect(cp.dom.input).toBe(document.activeElement);
  });
});
