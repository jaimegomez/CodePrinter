CodePrinter.defineAddon('shortcuts', function() {
  
  var shortcuts = {
    'Cmd Backspace': 'delToLeft',
    'Cmd Delete': 'delToRight',
    'Alt Up': 'prevSearchResult',
    'Alt Down': 'nextSearchResult',
    'Cmd Shift Up': 'toPrevDefinition',
    'Cmd Shift Down': 'toNextDefinition',
    'Cmd Alt Up': 'swapUp',
    'Cmd Alt Down': 'swapDown',
    'Cmd Shift D': 'duplicate',
    'Cmd F': function() {
      var p = prompt('Find...');
      p ? this.doc.search(p) : this.doc.searchEnd();
    },
    'Cmd Shift F': function() {
      this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
    },
    'Cmd I': 'reIndent',
    'Cmd J': function() {
      this.setCursorPosition(parseInt(prompt("Jump to line..."), 10) - 1, 0);
    },
    'Cmd M': 'toggleMark',
    'Ctrl N': 'toggleLineNumbers',
    'Cmd ]': 'indent',
    'Cmd [': 'outdent',
    'Cmd =': 'increaseFontSize',
    'Cmd -': 'decreaseFontSize',
    'Cmd /': 'toggleComment',
    'Cmd Shift /': 'toggleBlockComment',
    'Cmd Left': 'moveToLineStart',
    'Cmd Right': 'moveToLineEnd',
    'Cmd Up': 'moveToStart',
    'Cmd Down': 'moveToEnd',
    'Ctrl Shift Left': 'moveWordLeft',
    'Ctrl Shift Right': 'moveWordRight'
  }
  
  return function(cp, options) {
    for (var k in shortcuts) {
      cp.keyMap[k] = shortcuts[k];
    }
  }
});