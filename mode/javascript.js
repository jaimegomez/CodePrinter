/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {

  var FAKE_CONTEXT = 0
  , BLOCK_CONTEXT = 1
  , FUNCTION_CONTEXT = 3
  , ARROW_CONTEXT = 7
  , OBJECT_CONTEXT = 8
  , ARRAY_CONTEXT = 16
  , CLASS_CONTEXT = 32
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator
  , wordRgx = /[\w$\xa1-\uffff]/
  , operatorRgx = /[+\-*&%=<>!?|~^]/
  , closeBrackets = /^[}\]\)]/
  , controls = CodePrinter.keySet(['if','else','elseif','for','switch','while','do','try','catch','finally'])
  , constants = CodePrinter.keySet(['null','undefined','NaN','Infinity'])
  , rules = {}
  , keywords = CodePrinter.keySet([
    'var','let','const','return','new','case','continue','break','instanceof','typeof',
    'class','export','import','extends','yield','super','debugger','default','delete',
    'in','throw','void','with','of','public','private','package','protected',
    'interface','implements'
  ])
  , specials = CodePrinter.keySet([
    'this','$','_','window','document','console','arguments','function','navigator',
    'global','module','Object','Array','String','Number','Function','RegExp','Date',
    'Boolean','Math','JSON','Proxy','Promise','Map','WeakMap','Set','WeakSet','Symbol',
    'Reflect','Error','EvalError','InternalError','RangeError','ReferenceError',
    'StopIteration','SyntaxError','TypeError','URIError'
  ]);

  function string(character) {
    return function(stream, state) {
      var esc = !!state.escaped, ch;
      while (ch = stream.next()) {
        if (ch === character && !esc) break;
        if (esc = !esc && ch === '\\') {
          stream.undo(1);
          push(state, escapedString);
          return 'string';
        }
      }
      state.escaped = esc;
      if (ch || !esc) pop(state);
      if (!ch) return 'invalid';
      return 'string';
    }
  }
  function templateString(stream, state, escaped) {
    var esc = !!state.escaped, ch;
    while (ch = stream.next()) {
      if (ch === '`' && !esc) break;
      if (ch === '$' && stream.peek() === '{') {
        stream.undo(1);
        push(state, stringInjection);
        return 'string';
      }
      if (esc = !esc && ch === '\\') {
        stream.undo(1);
        push(state, escapedString);
        return 'string';
      }
    }
    state.escaped = esc;
    if (ch) {
      pop(state);
    }
    return 'string';
  }
  function stringInjection(stream, state) {
    if (stream.eatChain('${')) {
      push(state, function(stream, state) {
        var peek = stream.peek();
        if (peek === '}') {
          stream.next();
          pop(state);
          return 'escaped';
        }
        if (peek === '`') {
          pop(state);
          pop(state);
          return;
        }
        return this.iterator(stream, state);
      });
      return 'escaped';
    }
    pop(state);
    return stream.eatChain('}') ? 'escaped' : 'string';
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
    state.escaped = true;
  }
  function comment(stream, state) {
    var star, ch;
    while (ch = stream.next()) {
      if (star && ch === '/') {
        break;
      }
      star = ch === '*';
    }
    if (ch && star) pop(state);
    return 'comment';
  }
  function regexp(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch === '\\' && !stream.eol()) {
        stream.undo(1);
        push(state, escapedRegexp);
        return 'regexp';
      }
      if (ch === '/') {
        stream.take(/^[gimy]+/);
        pop(state);
        return 'regexp';
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
  function parameters(stream, state) {
    var ch = stream.next();
    if (ch) {
      if (ch === ')') {
        pop(state);
        return 'bracket';
      }
      if (ch === '.' && stream.eat('.') && stream.eat('.')) {
        return 'operator';
      }
      if (ch === ',' || ch === ' ') {
        return;
      }
      if (wordRgx.test(ch)) {
        var word = ch + stream.take(/^[\w$\xa1-\uffff]+/);
        if (stream.eol()) pop(state);
        state.context.params[word] = true;
        return 'parameter';
      }
      stream.undo(1);
    }
    pop(state);
  }
  function words(stream, state, ch) {
    var word = ch + stream.take(/^[\w$\xa1-\uffff]+/);
    if (word === 'function') {
      if (!state.fn) state.fn = true;
      return 'special';
    }
    if (word === 'var') {
      state.vardef = state.indent;
      return 'keyword';
    }
    if (word === 'let') {
      state.letdef = state.indent;
      return 'keyword';
    }
    if (word === 'class') {
      state.classdef = true;
      return 'keyword';
    }
    if (word === 'const') {
      state.constdef = state.indent;
      return 'keyword';
    }
    if (stream.lastValue === 'function') {
      state.fn = word;
      return saveVariable(state, word, 'function', 47);
    }
    if (stream.lastValue === 'class') {
      state.classdef = word;
      return saveVariable(state, word, 'variable', 47);
    }
    if (word === 'true' || word === 'false') return 'builtin boolean';
    if (constants[word]) return 'constant';
    if (controls[word] && stream.lastValue !== '.') {
      if (stream.lastSymbol !== 'control') state.control = word;
      return 'control';
    }
    if (specials[word]) return 'special';
    if (keywords[word]) return 'keyword';

    if (state.context.type === CLASS_CONTEXT) {
      if (stream.isAfter(/^\s*\(/)) {
        state.fn = word;
        return saveVariable(state, word, 'function', CLASS_CONTEXT);
      } else if (word === 'get' || word === 'set') {
        return 'keyword';
      }
    }
    if (stream.isAfter(/^\s*([:=]\s*function)?\s*\(/)) {
      var rgx = RegExp.$1, type = state.context.type;
      if (rgx) {
        state.fn = word;
        if (type === OBJECT_CONTEXT && rgx[0] === ':') {
          saveVariable(state, word, 'function', OBJECT_CONTEXT);
        }
        else if (type & BLOCK_CONTEXT && rgx[0] === '=') {
          saveVariable(state, word, 'function', state.letdef != null ? BLOCK_CONTEXT : FUNCTION_CONTEXT);
        }
      }
      return 'function';
    }
    if (stream.isAfter(/^\s*=>/)) {
      push(state, parameters);
      pushcontext(state, ARROW_CONTEXT);
      state.fatArrow = true;
      return parameters(stream, state);
    }

    if (state.context && (state.context.type !== OBJECT_CONTEXT || !stream.isAfter(/^\s*:/)) && !stream.isBefore(/\.\s*$/, -word.length)) {
      var isVar = isVariable(word, state);
      if (isVar && 'string' === typeof isVar) return isVar;
    }
    if ((!stream.lastValue || (stream.lastSymbol === 'keyword' && stream.lastValue !== 'new') || stream.lastValue === ',') && stream.isAfter(/^\s*([=;,]|$)/)) {
      if (state.vardef === state.indent) return saveVariable(state, word, 'variable', FUNCTION_CONTEXT);
      if (state.letdef === state.indent) return saveVariable(state, word, 'variable', BLOCK_CONTEXT);
      if (state.constdef === state.indent) return saveVariable(state, word, 'constant', FUNCTION_CONTEXT);
    }
    return 'word';
  }

  function pushcontext(state, type) {
    state.context = { type: type, prev: state.context, indent: state.indent + 1 };
    if (type & FUNCTION_CONTEXT) state.context.params = {};
  }
  function popcontext(state) {
    if (state.context.prev) {
      state.indent = state.context.indent - 1;
      state.context = state.context.prev;
    }
  }
  function isVariable(varname, state) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) {
      if (ctx.vars && ctx.vars[varname]) return ctx.vars[varname];
      if (ctx.params && ctx.params[varname]) return 'variable';
    }
  }
  function saveVariable(state, varname, vartype, type) {
    var ctx = state.context;
    while (ctx && ctx.prev && (ctx.type > type || !(ctx.type & type))) ctx = ctx.prev;
    if (ctx) {
      if (!ctx.vars) ctx.vars = {};
      ctx.vars[varname] = vartype;
    }
    return vartype;
  }
  function closeFatArrow(stream, state) {
    if (state.fatArrow && state.context.type === ARROW_CONTEXT) {
      popcontext(state);
      state.fatArrow = null;
    }
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

  rules['"'] = rules["'"] = function(stream, state, ch) {
    return push(state, string(ch))(stream, state);
  }
  rules['`'] = function(stream, state, ch) {
    return push(state, templateString)(stream, state);
  }
  rules['/'] = function(stream, state) {
    if (stream.eat('/')) {
      stream.skip();
      return 'comment';
    }
    if (stream.eat('*')) {
      return push(state, comment)(stream, state);
    }
    if (stream.lastSymbol === 'word' || stream.lastSymbol === 'parameter' || stream.lastSymbol === 'variable'
      || stream.lastSymbol === 'numeric' || stream.lastSymbol === 'constant' || stream.lastValue === ')') {
      return 'operator';
    }
    return push(state, regexp)(stream, state);
  }
  rules['.'] = function(stream, state) {
    if (stream.match(/^\d+(?:[eE][+\-]?\d+)?/, true)) return 'numeric';
    else if (stream.eat('.') && stream.eat('.')) return 'operator';
    return 'punctuation';
  }
  rules[','] = rules[':'] = function() { return 'punctuation'; }
  rules[';'] = function(stream, state) {
    if (state.vardef >= 0) state.vardef = null;
    if (state.letdef >= 0) state.letdef = null;
    if (state.constdef >= 0) state.constdef = null;
    closeFatArrow(stream, state);
    if (state.context.type === BLOCK_CONTEXT && state.context.open) {
      if (state.controlParenthesisClosed || state.control === 'else' && state.controlParenthesisClosed === null) {
        do popcontext(state); while (state.context.open);
        state.control = null;
      }
    }
    return 'punctuation';
  }
  rules['('] = function(stream, state) {
    if (state.control && stream.lastSymbol === 'control') {
      if (state.controlParenthesisClosed) state.controlParenthesisClosed = false;
      pushcontext(state, BLOCK_CONTEXT);
      state.context.open = true;
    }
    else if (state.fn && (stream.lastValue === 'function' || stream.lastSymbol === 'function')) {
      push(state, parameters);
      pushcontext(state, FUNCTION_CONTEXT);
      if ('string' === typeof state.fn) stream.markDefinition(new Definition(state.fn, state.context.params));
    }
    else if (!state.fn && stream.lastSymbol !== 'function' && stream.isAfter(/^[^\(\)]*\)\s*=>/)) {
      push(state, parameters);
      pushcontext(state, ARROW_CONTEXT);
      state.fatArrow = true;
    }
    else {
      pushcontext(state, FAKE_CONTEXT);
    }
    return 'bracket';
  }
  rules['{'] = function(stream, state) {
    var ctxType = state.context.type;
    if (state.control && ctxType === BLOCK_CONTEXT && state.context.open && stream.lastValue === ')') {
      if (state.controlParenthesisClosed) state.controlParenthesisClosed = null;
      state.control = null;
      state.context.open = false;
    }
    else if (state.fn && ctxType === FUNCTION_CONTEXT) {
      state.fn = null;
    }
    else if (state.fatArrow && ctxType === ARROW_CONTEXT && stream.lastValue === '=>') {
      state.fatArrow = false;
    }
    else if (state.classdef) {
      pushcontext(state, CLASS_CONTEXT);
      state.classdef = null;
    }
    else if (state.vardef === state.indent || state.letdef === state.indent) {
      pushcontext(state, OBJECT_CONTEXT);
    }
    else {
      pushcontext(state, BLOCK_CONTEXT);
    }
    return 'bracket';
  }
  rules['['] = function(stream, state) {
    pushcontext(state, ARRAY_CONTEXT);
    return 'bracket';
  }
  rules[')'] = function(stream, state) {
    closeFatArrow(stream, state);
    if (state.context.type === FAKE_CONTEXT) popcontext(state);
    else if (state.control) {
      if (state.vardef >= 0) state.vardef = null;
      if (state.letdef >= 0) state.letdef = null;
      state.controlParenthesisClosed = true;
    }
    else if (!state.fn) return 'invalid';
    return 'bracket';
  }
  rules['}'] = function(stream, state) {
    closeFatArrow(stream, state);
    if (state.context.type === BLOCK_CONTEXT && !state.context.open || state.context.type & 47) {
      if (state.control) state.control = undefined;
      popcontext(state);
    } else return 'invalid';
    return 'bracket';
  }
  rules[']'] = function(stream, state) {
    closeFatArrow(stream, state);
    if (state.context.type & ARRAY_CONTEXT) popcontext(state);
    else return 'invalid';
    return 'bracket';
  }
  rules['#'] = function(stream) {
    if (stream.peek() === '!' && stream.pos === 1) {
      stream.skip();
      return 'directive';
    }
    return 'invalid';
  }

  return new CodePrinter.Mode({
    name: 'JavaScript',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
    lineComment: '//',
    autoCompleteWord: /[\w_]+/,
    autoCompleteTriggers: /[\w_]/,
    indentTriggers: /[\}\]\)e]/,
    matching: 'brackets',

    initialState: function() {
      return {
        indent: 0,
        context: { type: BLOCK_CONTEXT, vars: {}, indent: 0 }
      }
    },
    iterator: function(stream, state) {
      var ch = stream.next(), rule = rules[ch];

      if (rule) return rule(stream, state, ch);

      if (ch === '0' && stream.eat(/x/i)) {
        stream.take(/^[\da-f]+/i);
        return 'numeric hex';
      }
      if (/\d/.test(ch)) {
        stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/, true);
        return 'numeric';
      }
      if (operatorRgx.test(ch)) {
        if (ch === '*' && stream.lastValue === 'function') return;
        stream.take(/^[+\-*&%=<>!?|~^]+/);
        return 'operator';
      }
      if (wordRgx.test(ch)) {
        return words(stream, state, ch);
      }
    },
    onExit: function(stream, state) {
      state.indent = state.context.indent;
    },
    indent: function(stream, state, nextIteration) {
      var i = state.indent, peek = stream.peek();
      if (stream.lastSymbol === 'bracket' && stream.isAfter(closeBrackets)) return [i, -1];
      if (closeBrackets.test(peek)) {
        if (peek === ')') return state.context.type === FAKE_CONTEXT ? i - 1 : null;
        if (peek === ']') return state.context.type === ARRAY_CONTEXT ? i - 1 : null;
        if (peek === '}') return state.context.type & 47 ? i - 1 : null;
        if (!/\bbracket\b/.test(nextIteration()) || stream.lastValue !== peek) return null;
      }
      if (peek === 'e') return stream.isBefore('els') && stream.lastSymbol === 'control' ? i : null;
      if (state.parser && stream.isAfter(/^\s*<\s*\/\s*script/i)) return i - 1;
      return i;
    },
    completions: function(stream, state) {
      var vars = [];
      for (var ctx = state.context; ctx; ctx = ctx.prev) {
        if (ctx.vars) vars.push.apply(vars, Object.keys(ctx.vars));
        if (ctx.params) vars.push.apply(vars, Object.keys(ctx.params));
      }
      return {
        values: vars,
        search: 200
      }
    },
    snippets: {
      'fun': {
        content: 'function() {}',
        cursorMove: -4
      },
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
    },
    FAKE_CONTEXT: FAKE_CONTEXT,
    BLOCK_CONTEXT: BLOCK_CONTEXT,
    FUNCTION_CONTEXT: FUNCTION_CONTEXT,
    ARROW_CONTEXT: ARROW_CONTEXT,
    OBJECT_CONTEXT: OBJECT_CONTEXT,
    ARRAY_CONTEXT: ARROW_CONTEXT,
    CLASS_CONTEXT: CLASS_CONTEXT
  });
});