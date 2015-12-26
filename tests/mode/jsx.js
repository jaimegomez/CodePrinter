describe('JSX', function() {
  var lines = [
    '"use strict";',
    'let React = require("react");',
    '',
    'let Component = React.createClass({',
    'render() {',
    'return (',
    '<div className="Component">',
    '<input type="text" value={this.props.value + 8} />',
    '{this.props.children}',
    '</div>',
    ');',
    '}',
    '});',
    '',
    'module.exports = Component;'
  ];
  
  var doc = cp.createDocument(lines.join('\n'), 'JSX');
  
  beforeAll(function() {
    cp.setDocument(doc);
  });
  
  it('should reindent', function() {
    var indents = [0, 0, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 0];
    cp.exec('reindent');
    for (var i = 0; i < indents.length; i++) {
      expect(doc.getIndent(i)).toBe(indents[i]);
    }
  });
  
  it('should recognize tags', function() {
    expect(doc.hasSymbolAt(['keyword', 'open-tag'], [6, 8])).toBeTruthy();
    expect(doc.hasSymbolAt(['keyword', 'open-tag'], [7, 10])).toBeTruthy();
    expect(doc.hasSymbolAt(['keyword', 'close-tag'], [9, 11])).toBeTruthy();
  });
  
  it('should recognize tag properties', function() {
    expect(doc.hasSymbolAt('property', [6, 12])).toBeTruthy();
    expect(doc.hasSymbolAt('property', [7, 19])).toBeTruthy();
    expect(doc.hasSymbolAt('property', [7, 31])).toBeTruthy();
  });
  
  it('should recognize strings', function() {
    expect(doc.hasSymbolAt('string', [0, 5])).toBeTruthy();
    expect(doc.hasSymbolAt('string', [6, 29])).toBeTruthy();
    expect(doc.hasSymbolAt('string', [7, 25])).toBeTruthy();
  });
  
  it('should recognize javascript interpolation', function() {
    expect(doc.hasSymbolAt('special', [7, 37])).toBeTruthy();
    expect(doc.hasSymbolAt('operator', [7, 52])).toBeTruthy();
    expect(doc.hasSymbolAt('numeric', [7, 54])).toBeTruthy();
  });
});
