/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {
  
  var FAKE_CONTEXT = 0
  , BLOCK_CONTEXT = 1
  , FUNCTION_CONTEXT = 3
  , ARROW_CONTEXT = 7
  , OBJECT_CONTEXT = 8
  , ARRAY_CONTEXT = 16
  , CLASS_CONTEXT = 32
  , wordRgx = /[\w$\xa1-\uffff]/
  , operatorRgx = /[+\-*&%=<>!?|~^]/
  , closeBrackets = /^[}\]\)]/
  , controls = ['if','else','elseif','for','switch','while','do','try','catch','finally']
  , constants = ['null','undefined','NaN','Infinity']
  , keywords = [
    'var','let','const','return','new','case','continue','break','instanceof','typeof',
    'class','export','import','extends','yield','super','debugger','default','delete',
    'in','throw','void','with','of','public','private','package','protected',
    'interface','implements'
  ]
  , specials = [
    'this','$','_','window','document','console','arguments','function','navigator',
    'global','module','Object','Array','String','Number','Function','RegExp','Date',
    'Boolean','Math','JSON','Proxy','Promise','Map','WeakMap','Set','WeakSet','Symbol',
    'Reflect','Error','EvalError','InternalError','RangeError','ReferenceError',
    'StopIteration','SyntaxError','TypeError','URIError'
  ];
  
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
    else state.next = null;
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
  function words(stream, state, ch) {
    var word = ch + stream.take(/^[\w$\xa1-\uffff]+/);
    if (word == 'function') {
      if (!state.fn) state.fn = true;
      return 'special';
    }
    if (word == 'var') {
      state.vardef = state.indent;
      return 'keyword';
    }
    if (word == 'let') {
      state.letdef = state.indent;
      return 'keyword';
    }
    if (word == 'class') {
      state.classdef = true;
      return 'keyword';
    }
    if (word == 'const') {
      state.constdef = state.indent;
      return 'keyword';
    }
    if (stream.lastValue == 'function') {
      state.fn = word;
      return state.context.vars[word] = 'function';
    }
    if (stream.lastValue == 'class') {
      state.classdef = word;
      return state.context.vars[word] = 'variable';
    }
    if (word == 'true' || word == 'false') return 'builtin boolean';
    if (constants.indexOf(word) >= 0) return 'constant';
    if (controls.indexOf(word) >= 0) {
      if (stream.lastStyle != 'control') markControl(state, word);
      return 'control';
    }
    if (word == 'case' || word == 'default') {
      markControl(state, word);
      return 'keyword';
    }
    if (specials.indexOf(word) >= 0) return 'special';
    if (keywords.indexOf(word) >= 0) return 'keyword';
    
    if (state.context.type == CLASS_CONTEXT) {
      if (stream.isAfter(/^\s*\(/)) {
        state.fn = word;
        return state.context.vars[word] = 'function';
      } else if (word == 'get' || word == 'set') {
        return 'keyword';
      }
    }
    if (stream.isAfter(/^\s*([:=]\s*function)?\s*\(/)) {
      var rgx = RegExp.$1;
      if (rgx) {
        state.fn = word;
        if (state.context.type == OBJECT_CONTEXT && rgx[0] == ':') {
          state.context.vars[word] = 'function';
        }
      }
      return 'function';
    }
    
    if (state.context && (state.context.type != OBJECT_CONTEXT || !stream.isAfter(/^\s*:/)) && !stream.isBefore(/\.\s*$/, -word.length)) {
      var isVar = isVariable(word, state);
      if (isVar && 'string' === typeof isVar) return isVar;
    }
    if ((!stream.lastValue || (stream.lastStyle == 'keyword' && stream.lastValue != 'new') || stream.lastValue == ',') && stream.isAfter(/^\s*([=;,]|$)/)) {
      if (state.vardef == state.indent) return saveVariable(state, word, 'variable', FUNCTION_CONTEXT);
      if (state.letdef == state.indent) return saveVariable(state, word, 'variable', BLOCK_CONTEXT);
      if (state.constdef == state.indent) return saveVariable(state, word, 'constant', FUNCTION_CONTEXT);
    }
    return 'word';
  }
  
  function pushcontext(stream, state, type) {
    stream.contexts = (stream.contexts | 0) + 1;
    if (stream.contexts == 1) ++state.indent;
    state.context = { type: type, prev: state.context };
    if (type & BLOCK_CONTEXT) {
      state.context.vars = {};
      state.context.params = {};
    }
  }
  function popcontext(stream, state) {
    if (state.context.prev) {
      stream.contexts = (stream.contexts | 0) - 1;
      if (stream.contexts == 0 || stream.contexts == -1) --state.indent;
      state.context = state.context.prev;
    }
  }
  function isVariable(varname, state) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) {
      if (ctx.type & BLOCK_CONTEXT) {
        if (ctx.vars[varname]) return ctx.vars[varname];
        if (ctx.params[varname]) return 'variable';
      }
    }
  }
  function saveVariable(state, varname, vartype, type) {
    var ctx = state.context;
    while (ctx && ctx.prev && !(ctx.type & type)) ctx = ctx.prev;
    if (ctx) ctx.vars[varname] = vartype;
    return vartype;
  }
  function markControl(state, word) {
    state.controlLevel = (state.controlLevel || 0) + 1;
    state.control = word;
  }
  function terminateControls(stream, state) {
    for (var i = state.controlLevel; i > 0 && state.context.open; --i) {
      popcontext(stream, state);
    }
    if (state.controlLevel == 0) state.controlLevel = null;
  }
  
  function Definition(name, params) {
    this.name = name;
    this.params = params;
  }
  Definition.prototype = {
    toString: function() {
      var pstr = '';
      for (var k in this.params) pstr += k + ', ';
      return this.name + '(' + pstr.slice(0, -2) + ')';
    }
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
      if (stream.pos == 0) stream.brackets = 0;
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
        if (stream.lastStyle == 'word' || stream.lastStyle == 'parameter' || stream.lastStyle == 'variable'
        || stream.lastStyle == 'numeric' || stream.lastStyle == 'constant' || stream.lastValue == ')') {
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
      if (ch == ',' || ch == ':') return 'punctuation';
      if (ch == ';') {
        if (state.vardef >= 0) state.vardef = null;
        if (state.letdef >= 0) state.letdef = null;
        if (state.constdef >= 0) state.constdef = null;
        if (state.fatArrow && state.context.type & ARROW_CONTEXT) {
          state.fatArrow = null;
          popcontext(stream, state);
        }
        if (state.controlLevel) {
          if (state.control == 'for' ? stream.isBefore() : state.control != 'case' && state.control != 'default') {
            terminateControls(stream, state);
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
      if (ch == '(' || ch == '{' || ch == '[') {
        if (ch == '(') {
          if (state.control && stream.lastStyle == 'control') {
            pushcontext(stream, state, BLOCK_CONTEXT);
            state.context.open = true;
          }
          else if (state.fn && (stream.lastValue == 'function' || stream.lastStyle == 'function')) {
            state.next = parameters;
            pushcontext(stream, state, FUNCTION_CONTEXT);
            if ('string' == typeof state.fn) stream.markDefinition(new Definition(state.fn, state.context.params));
          }
          else if (!state.fn && stream.lastStyle != 'function' && stream.isAfter(/^[^\)]*\)\s*=>/)) {
            state.next = parameters;
            pushcontext(stream, state, ARROW_CONTEXT);
            state.fatArrow = true;
          }
          else {
            pushcontext(stream, state, FAKE_CONTEXT);
          }
        }
        else if (ch == '{') {
          if (state.control && state.context.type == BLOCK_CONTEXT && state.context.open && stream.lastValue == ')') {
            state.control = null;
            state.context.open = false;
          }
          else if (state.fn && state.context.type == FUNCTION_CONTEXT) {
            state.fn = null;
          }
          else if (state.fatArrow && state.context.type == ARROW_CONTEXT && stream.lastValue == '=>') {
            state.fatArrow = false;
          }
          else if (state.classdef) {
            pushcontext(stream, state, CLASS_CONTEXT);
            state.classdef = null;
          }
          else if (state.vardef == state.indent || state.letdef == state.indent) {
            pushcontext(stream, state, OBJECT_CONTEXT);
          }
          else {
            pushcontext(stream, state, BLOCK_CONTEXT);
          }
        }
        else if (ch == '[') {
          pushcontext(stream, state, ARROW_CONTEXT);
        }
        return 'bracket';
      }
      if (ch == ')' || ch == '}' || ch == ']') {
        if (state.fatArrow && state.context.type == ARROW_CONTEXT) {
          popcontext(stream, state);
        }
        if (ch == ')') {
          if (state.context.type == FAKE_CONTEXT) {
            popcontext(stream, state);
          }
        }
        else if (ch == '}') {
          if (state.context.type == BLOCK_CONTEXT && !state.context.open || state.context.type & FUNCTION_CONTEXT) {
            popcontext(stream, state);
          }
          if (state.controlLevel) terminateControls(stream, state);
        }
        else if (ch == ']') {
          if (state.context.type & ARROW_CONTEXT) {
            popcontext(stream, state);
          }
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
        if (ch == '*' && stream.lastValue == 'function') return;
        stream.take(/^[+\-*&%=<>!?|~^]+/);
        return 'operator';
      }
      if (wordRgx.test(ch)) {
        return words(stream, state, ch);
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
      var i = state.indent, peek = stream.peek();
      
      if (stream.lastStyle == 'bracket' && stream.isAfter(closeBrackets)) return [i, -1];
      if (peek == ')') return state.context.type == FAKE_CONTEXT && stream.pos == 1 ? i : null;
      if (peek == 'e') return stream.isAfter('else') && stream.lastStyle == 'control' ? i - 1 : null;
      if (stream.isAfter(closeBrackets) || state.parser && stream.isAfter(/^\s*<\s*\/\s*script/i)) return i - 1;
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