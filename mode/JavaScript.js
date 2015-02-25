/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {
  
  var wordRgx = /[\w$\xa1-\uffff]/
  , operatorRgx = /[+\-*&%=<>!?|~^]/
  , closeBrackets = /^[}\]\)]/
  , controls = ['if','else','elseif','for','switch','while','do','try','catch','finally']
  , constants = ['null','undefined','NaN','Infinity']
  , keywords = [
    'var','return','new','case','continue','break','instanceof','typeof','let','class',
    'extends','yield','debugger','default','delete','in','throw','public','private',
    'void','with','const','of'
  ]
  , specials = [
    'this','window','document','console','arguments','function','import','export','module',
    'Object','Array','String','Number','Function','RegExp','Date','Boolean','Math','JSON',
    'Proxy','Map','WeakMap','Set','WeakSet','Symbol',
    'Error','EvalError','InternalError','RangeError','ReferenceError',
    'StopIteration','SyntaxError','TypeError','URIError'
  ]
  
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
    state.quote = null;
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
  function comment(stream, state) {
    var star, ch;
    while (ch = stream.next()) {
      if (star && ch == '/') {
        break;
      }
      star = ch == '*';
    }
    state.next = ch && star ? null : comment;
    return 'comment';
  }
  function regexp(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch == '\\' && !stream.eol()) {
        stream.undo(1);
        state.next = escapedRegexp;
        return 'regexp';
      }
      if (ch == '/') {
        stream.take(/^[gimy]+/);
        state.next = null;
        return 'regexp';
      }
    }
    state.next = null;
    return 'regexp';
  }
  function escapedRegexp(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        state.next = regexp;
        return 'escaped';
      }
      stream.undo(1);
    }
    return regexp(stream, state, true);
  }
  function parameters(stream, state) {
    var ch = stream.next();
    if (ch) {
      if (ch == ')') {
        state.next = null;
        return 'bracket';
      }
      if (ch == '.' && stream.eat('.') && stream.eat('.')) {
        state.next = parameters;
        return 'operator';
      }
      if (ch == ',' || ch == ' ') {
        state.next = parameters;
        return;
      }
      if (wordRgx.test(ch)) {
        var word = ch + stream.take(/^[\w$\xa1-\uffff]+/);
        if (stream.eol()) state.next = null;
        state.context.params[word] = true;
        return 'parameter';
      }
      stream.undo(1);
      return state.next = null;
    }
    return state.next = null;
  }
  
  function pushcontext(state) {
    state.context = { vars: {}, params: {}, indent: state.indent + 1, prev: state.context };
  }
  function popcontext(state) {
    if (state.context.prev) state.context = state.context.prev;
  }
  function isVariable(varname, state) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) if (ctx.vars[varname]) return ctx.vars[varname];
  }
  function markControl(state, word) {
    state.controlLevel = (state.controlLevel || 0) + 1;
    state.control = word;
  }
  
  return new CodePrinter.Mode({
    name: 'JavaScript',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
    lineComment: '//',
    indentTriggers: /[\}\]\)e]/,
    matching: 'brackets',
    
    initialState: function() {
      return {
        indent: 0,
        context: { vars: {}, params: {}, indent: 0 }
      }
    },
    iterator: function(stream, state) {
      var ch = stream.next();
      if (ch == '"' || ch == "'" || ch == '`') {
        state.quote = ch;
        return string(stream, state);
      }
      if (ch == '/') {
        if (stream.eat('/')) {
          stream.skip();
          return 'comment';
        }
        if (stream.eat('*')) {
          return comment(stream, state);
        }
        if (stream.lastStyle == 'word' || stream.lastStyle == 'parameter' || stream.lastStyle == 'numeric'
          || stream.lastStyle == 'constant' || stream.lastValue == ')') {
          return 'operator';
        }
        return regexp(stream, state);
      }
      if (ch == '.') {
        if (stream.match(/^\d+(?:[eE][+\-]?\d+)?/, true)) {
          return 'numeric';
        } else if (stream.eat('.') && stream.eat('.')) {
          return 'operator';
        }
        return 'punctuation';
      }
      if (ch == ',') {
        if (state.vardef == 2) --state.vardef;
        else if (state.constdef == 2) --state.constdef;
        return 'punctuation';
      }
      if (ch == ';') {
        if (state.vardef) state.vardef = null;
        if (state.constdef) state.constdef = null;
        if (state.controlLevel) {
          if (['for','case','default'].indexOf(state.control) == -1) {
            state.controlLevel = state.control = null;
          } else if (/\b(break|continue|return)\b/.test(stream.value.substring(0, stream.pos))) {
            --state.controlLevel;
            state.control = null;
          }
        }
        return 'punctuation';
      }
      if (ch == '0' && stream.eat(/x/i)) {
        stream.take(/^[\da-f]+/i);
        return 'numeric hex';
      }
      if (/[\[\]{}\(\)]/.test(ch)) {
        if (ch == '(' && state.fn && (stream.lastValue == 'function' || stream.lastStyle == 'function') && !stream.eol()) {
          state.next = parameters;
          pushcontext(state);
          if ('string' == typeof state.fn) {
            stream.markDefinition({
              name: state.fn,
              params: state.context.params
            });
          }
          state.fn = null;
        }
        if (ch == '{') {
          if (state.controlLevel) {
            --state.controlLevel;
            if (!state.controlLevel) state.controlLevel = null;
          }
          ++state.indent;
        } else if (ch == '}') {
          if (state.indent == state.context.indent) {
            popcontext(state);
          }
          --state.indent;
        }
        return 'bracket';
      }
      if (/\d/.test(ch)) {
        stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/, true);
        return 'numeric';
      }
      if (ch == '<' && state.parser && stream.isAfter(/^\s*\/\s*script/i)) {
        state.parser = null;
        stream.undo(1);
        return;
      }
      if (operatorRgx.test(ch)) {
        if (ch == '=') {
          if (state.vardef == 1) ++state.vardef;
          else if (state.constdef == 1) ++state.constdef;
        }
        stream.take(/^[+\-*&%=<>!?|~^]+/);
        return 'operator';
      }
      if (wordRgx.test(ch)) {
        var word = ch + stream.take(/^[\w$\xa1-\uffff]+/);
        if (word == 'function') {
          state.fn = true;
          return 'special';
        }
        if (word == 'var') {
          state.vardef = 1;
          return 'keyword';
        }
        if (word == 'const') {
          state.constdef = 1;
          return 'keyword';
        }
        if (stream.lastValue == 'function') {
          state.fn = word;
          return state.context.vars[word] = 'function';
        }
        if (word == 'true' || word == 'false') return 'builtin boolean';
        if (constants.indexOf(word) >= 0) return 'constant';
        if (controls.indexOf(word) >= 0) {
          markControl(state, word);
          return 'control';
        }
        if (word == 'case' || word == 'default') {
          markControl(state, word);
          return 'keyword';
        }
        if (specials.indexOf(word) >= 0) return 'special';
        if (keywords.indexOf(word) >= 0) return 'keyword';
        
        if (state.context) {
          if (state.context.params[word] && !stream.isBefore(/\.\s*$/, -word.length)) {
            return 'variable';
          }
          var isVar = isVariable(word, state);
          if (isVar && 'string' === typeof isVar) return isVar;
        }
        if (stream.isAfter(/^\s*\(/)) return 'function';
        if (stream.isAfter(/^\s*:/) || stream.isBefore(/\.\s*$/, -word.length) && stream.peek() != '.') return 'property';
        if (!stream.lastValue || (stream.lastStyle == 'keyword' && stream.lastValue != 'new') || stream.lastValue == ',') {
          if (state.vardef == 1) return state.context.vars[word] = 'variable';
          if (state.constdef == 1) return state.context.vars[word] = 'constant';
        }
        return 'word';
      }
      if (ch == '#') {
        if (stream.peek() == '!' && stream.pos == 1) {
          stream.skip();
          return 'directive';
        }
        return 'invalid';
      }
    },
    indent: function(stream, state) {
      var i = state.indent + (state.controlLevel || 0);
      if (stream.lastStyle == 'bracket') {
        if (stream.isAfter(closeBrackets)) return [i, -1];
      }
      if (stream.isAfter(closeBrackets) || state.parser && stream.isAfter(/^\s*<\s*\/\s*script/i)) return i - 1;
      if (stream.isAfter(/^e(lse)?\b/)) return RegExp.$1 ? i : stream.indentation;
      return i;
    },
    completions: function(stream, state) {
      var vars = [];
      for (var ctx = state.context; ctx; ctx = ctx.prev) {
        vars.push.apply(vars, Object.keys(ctx.vars));
        vars.push.apply(vars, Object.keys(ctx.params));
      }
      return {
        values: vars,
        search: 200
      }
    },
    snippets: {
      'log': {
        content: 'console.log();',
        cursorMove: -2
      },
      'dcl': {
        content: '$(function() {});',
        cursorMove: -3
      },
      'sif': {
        content: '(function() {})();',
        cursorMove: -5
      },
      'timeout': {
        content: 'setTimeout(function() {}, 100);',
        cursorMove: -8
      },
      'interval': {
        content: 'setInterval(function() {}, 100);',
        cursorMove: -8
      }
    }
  });
});