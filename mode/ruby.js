/* CodePrinter - Ruby mode */

CodePrinter.defineMode('Ruby', function() {
  
  var operatorRgx = /[+\-\*\/%=!<>&|^~]/
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator
  , controls = [
    'begin','case','def','do','else','elseif','end','for',
    'then','undef','until','while','if','unless'
  ]
  , specials = [
    'eval','fail','gets','lambda','print','proc','puts'
  ]
  , keywords = [
    'alias','and','break','class','defined?','ensure','in','loop','module',
    'next','nil','not','or','private','protected','public','redo','rescue',
    'retry','return','self','super','when','yield'
  ]
  
  function string(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch == state.quote && !esc) break;
      if (esc = !esc && ch == '\\') {
        stream.undo(1);
        push(state, escapedString);
        return 'string';
      }
    }
    if (ch) {
      pop(state);
      state.quote = undefined;
    }
    return 'string';
  }
  function escapedString(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        pop(state);
        return 'escaped';
      }
      stream.undo(1);
    }
    pop(state);
    return string(stream, state, true);
  }
  function comment(stream, state) {
    if (stream.match(/=end/i, true)) {
      pop(state);
      return 'comment';
    }
    stream.skip();
    return 'comment';
  }
  function regexp(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch == '\\' && !stream.eol()) {
        stream.undo(1);
        push(state, escapedRegexp);
        return 'regexp';
      }
      if (ch == '/') {
        stream.eatWhile(/[ioxmuesn]/);
        break;
      }
    }
    pop(state);
    return 'regexp';
  }
  function escapedRegexp(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        pop(state);
        return 'escaped';
      }
      stream.undo(1);
    }
    pop(state);
    return regexp(stream, state, true);
  }
  
  function pushcontext(state) {
    state.context = { vars: {}, params: {}, indent: state.indent + 1, prev: state.context };
  }
  function popcontext(state) {
    if (state.context.prev) state.context = state.context.prev;
  }
  function isVariable(varname, state) {
    for (var ctx = state.context; ctx; ctx = ctx.prev)
      if (ctx.vars[varname] === true || ctx.params[varname] === true)
        return true;
  }
  
  return new CodePrinter.Mode({
    name: 'Ruby',
    blockCommentStart: '=begin',
    blockCommentEnd: '=end',
    lineComment: '#',
    matching: 'brackets',
    
    initialState: function() {
      return {
        indent: 0,
        context: { vars: {}, params: {}, indent: 0 }
      }
    },
    iterator: function(stream, state) {
      var ch = stream.next();
      
      if (ch == "'" || ch == '"') {
        state.quote = ch;
        return push(state, string)(stream, state);
      }
      if (ch == '$' || ch == '@') {
        if (ch == '@') stream.eat('@');
        stream.eatWhile(/\w/);
        return 'variable';
      }
      if (ch == '#') {
        stream.skip();
        return 'comment';
      }
      if (ch == '0' && stream.eat(/x/i)) {
        stream.eatWhile(/[0-9a-f]/i);
        return 'numeric hex';
      }
      if (/[\[\]{}\(\)]/.test(ch)) {
        if (ch == ')' && state.def) state.def = undefined;
        return 'bracket';
      }
      if (ch == '=' && stream.match(/^begin/i, true)) {
        return push(state, comment)(stream, state);
      }
      if (ch == '/' && (!stream.lastValue || stream.lastStyle == 'operator')) {
        return push(state, regexp)(stream, state);
      }
      if (operatorRgx.test(ch)) {
        stream.eatWhile(operatorRgx);
        return 'operator';
      }
      if (/\d/.test(ch)) {
        stream.match(/^\d*(\.\d+)?/, true);
        return 'numeric';
      }
      if (/\w/.test(ch)) {
        var word = (ch + stream.eatWhile(/\w/)).toLowerCase();
        
        if (word == 'def') {
          if (!stream.eol()) state.def = true;
          pushcontext(state);
          ++state.indent;
          return 'control';
        }
        if (state.def) {
          if (state.def === true) {
            state.def = word;
            stream.markDefinition({
              name: word,
              params: state.context.params
            });
            return 'special';
          }
          if ('string' == typeof state.def) {
            state.context.params[word] = true;
            return 'parameter';
          }
        }
        
        if (word == 'true' || word == 'false') return 'builtin boolean';
        if (word == 'do' || word == 'elsif' || word == 'else' || (stream.pos == 2 && word == 'if') || (stream.pos == 6 && word == 'unless')) {
          ++state.indent;
          return 'control';
        }
        if (word == 'end') {
          if (state.indent == state.context.indent) {
            popcontext(state);
          }
          --state.indent;
          return 'control';
        }
        if (controls.indexOf(word) >= 0) return 'control';
        if (keywords.indexOf(word) >= 0) return 'keyword';
        if (specials.indexOf(word) >= 0) return 'special';
        
        if (isVariable(word, state)) return 'variable';
        if (stream.isAfter(/^\s*\(/)) return 'function';
        if (ch == ch.toUpperCase()) return 'constant';
      }
    },
    indentation: function(textBefore, textAfter, line, indent, parser) {
      var words = textBefore.match(/(\w+)/);
      if (words) {
        for (var i = 1; i < words.length; i++) {
          if (indentIncrements.indexOf(words[i].toLowerCase()) >= 0) {
            return 1;
          }
        }
      }
      return 0;
    }
  });
});
