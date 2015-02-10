/* CodePrinter - XML Mode */

CodePrinter.defineMode('XML', function() {
  
  var wordRgx = /[\w\-]/i
  , selfClosingTagsRgx = /^(area|base|br|c(ol|ommand)|embed|hr|i(mg|nput)|keygen|link|meta|param|source|track|wbr)$/i
  , matchTagNameRgx = /<\s*(\w+)\s*[^>]*>?$/;
  
  function comment(stream, state) {
    if (stream.eatUntil(/\-\-\>/)) {
      state.next = undefined;
    } else {
      stream.skip();
      state.next = comment;
    }
    return 'comment';
  }
  function string(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch == state.quote && !esc) break;
      if (esc = !esc && ch == '\\') {
        stream.undo(1);
        state.next = escapedString;
        return 'string';
      }
    }
    if (!ch && esc) state.next = string;
    state.next = null;
    if (!ch) return 'invalid';
    state.quote = undefined;
    return 'string';
  }
  function escapedString(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        state.next = string;
        return 'escaped';
      }
      stream.undo(1);
    }
    return string(stream, state, true);
  }
  function cdata(stream, state) {
    while (ch = stream.next()) {
      if (ch == ']' && stream.match(/^\]>/, true)) {
        state.next = undefined;
        return 'comment cdata';
      }
    }
    state.next = cdata;
    return 'comment cdata';
  }
  
  return new CodePrinter.Mode({
    name: 'XML',
    blockCommentStart: '<!--',
    blockCommentEnd: '-->',
    indentTriggers: /</,
    autoCompleteTriggers: /</,
    
    initialState: function() {
      return {
        indent: 0
      }
    },
    iterator: function(stream, state) {
      if (stream.pos == 0) state.tagName = state.bracketopen = state.closingTag = undefined;
      var ch = stream.next();
      if (state.bracketopen) {
        if (ch == '>') {
          if (!state.tagName) {
            state.bracketopen = undefined;
            return 'invalid';
          }
          if (!stream.isBefore(/\/\s*>/)) {
            state.closingTag ? --state.indent : ++state.indent;
          }
          state.bracketopen = state.tagName = state.closingTag = undefined;
          return 'bracket';
        }
        if (ch == '"' || ch == "'") {
          state.quote = ch;
          return string(stream, state);
        }
        if (ch == '=') {
          return 'operator';
        }
        if (/[a-z]/i.test(ch)) {
          var word = ch + stream.eatWhile(wordRgx);
          if (state.tagName) {
            return 'property';
          }
          state.tagName = word;
          return 'keyword';
        }
      }
      if (ch == '&') {
        if (stream.match(/^[^;]+;/, true)) {
          return 'escaped';
        }
        return 'invalid';
      }
      if (ch == '<') {
        if (stream.eat('!')) {
          if (stream.match(/^\-\-/, true)) {
            return comment(stream, state);
          }
          if (stream.match(/^\[CDATA\[/, true)) {
            return cdata(stream, state);
          }
          if (stream.eatUntil(/>/)) {
            return 'special doctype';
          }
        }
        if (stream.eatUntil(/^\s*\//)) state.closingTag = true;
        state.bracketopen = true;
        return 'bracket';
      }
    },
    indent: function(stream, state) {
      if (stream.lastValue == '>' && stream.isAfter('<')) {
        return [state.indent, -1];
      }
      if (stream.isAfter(/^\s*<\//)) {
        return state.indent - 1;
      }
      return state.indent;
    },
    keyMap: {
      '>': function(stream, state) {
        if (this.options.insertClosingBrackets) {
          var bf = stream.value.substring(0, stream.pos)
          , m = bf.match(matchTagNameRgx);
          
          if (m && m[1] && bf[bf.length-1] !== '>') {
            var z = m[1].trim();
            if (z[z.length-1] !== '/' && !selfClosingTagsRgx.test(m[1])) {
              this.insertText('></'+m[1]+'>', -m[1].length - 3);
              return false;
            }
          }
        }
      }
    }
  });
});