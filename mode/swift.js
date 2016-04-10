/* CodePrinter - Swift mode */

CodePrinter.defineMode('Swift', function() {
  
  var wordRgx = /[\w$\xa1-\uffff]/
  , takeWordRgx = /^[\w$\xa1-\uffff]+/
  , operators = /[\/=\-+!*%<>&|^?~]/
  , closeBrackets = /[\)\}\]]/
  , rules = {}
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator
  , attributes = CodePrinter.keySet([
    'autoclosure', 'available', 'objc', 'noescape', 'nonobjc', 'noreturn',
    'NSApplicationMain', 'NSCopying', 'NSManaged', 'testable', 'UIApplicationMain',
    'warn_unused_result', 'IBAction', 'IBDesignable', 'IBInspectable', 'IBOutlet'
  ])
  , builtins = CodePrinter.keySet([
    'String', 'Bool', 'Int', 'UInt', 'Float', 'Double', 'Character', 'Optional',
    'Int8', 'UInt8', 'Int32', 'UInt32', 'Int64', 'UInt64', 'Set'
  ])
  , controls = CodePrinter.keySet([
    'if', 'do', 'else', 'for', 'guard', 'switch', 'while', 'catch'
  ])
  , keywords = CodePrinter.keySet([
    'class', 'deinit', 'enum', 'extension', 'func', 'import', 'init', 'inout',
    'internal', 'let', 'operator', 'private', 'protocol', 'public', 'static',
    'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'continue',
    'default', 'defer', 'fallthrough', 'in', 'repeat', 'return', 'where',
    'as', 'dynamicType', 'is', 'rethrows', 'super', 'self', 'Self', 'throw',
    'throws', 'try', '__COLUMN__', '__FILE__', '__FUNCTION__', '__LINE__', '_',
    'associativity', 'convenience', 'dynamic', 'didSet', 'final', 'get', 'infix',
    'indirect', 'lazy', 'left', 'mutating', 'none', 'nonmutating', 'optional',
    'override', 'postfix', 'precedence', 'prefix', 'Protocol', 'required',
    'right', 'set', 'Type', 'unowned', 'weak', 'willSet'
  ])
  , escapedChars = CodePrinter.keySet([
    '0', '\\', 't', 'n', 'r', '"', "'"
  ]);
  
  var BLOCK = 1, FUNCTION = 2, FUNCTION_CALL = 4;
  
  function string(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch === '"' && !esc) break;
      if (esc = !esc && ch === '\\') {
        stream.undo(1);
        push(state, escapedString);
        return 'string';
      }
    }
    if (ch || !esc) pop(state);
    if (!ch) return 'invalid';
    return 'string';
  }
  function escapedString(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        if (escapedChars[ch]) {
          pop(state);
          return 'escaped';
        }
        if (ch === 'u') {
          stream.take(/^[0-9a-f]{1,8}/i);
          pop(state);
          return 'escaped';
        }
        if (ch === '(') {
          push(state, stringInterpolation);
          return 'escaped';
        }
      }
      stream.undo(1);
    }
    pop(state);
    return string(stream, state, true);
  }
  function stringInterpolation(stream, state) {
    if (stream.eat(')')) {
      pop(state); // pop stringInterpolation
      pop(state); // pop escapedString
      return 'escaped';
    }
    return this.iterator(stream, state);
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
  
  function pushcontext(state, type) {
    state.context = { type: type, prev: state.context, indent: state.indent + 1 };
  }
  function popcontext(state) {
    if (state.context.prev) {
      state.indent = state.context.indent - 1;
      state.context = state.context.prev;
    }
  }
  function isVariable(state, varName) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) {
      if (ctx.var && ctx.var[varName]) return 'variable';
      if (ctx.let && ctx.let[varName]) return 'variable';
      if (ctx.func && ctx.func[varName]) return 'function';
      if (ctx.param && ctx.param[varName]) return 'variable';
      if (ctx.class && ctx.class[varName]) return 'special';
    }
  }
  function saveVariable(ctx, varName, varType) {
    if (!ctx[varType]) ctx[varType] = {};
    ctx[varType][varName] = true;
  }
  function pushVars(vars) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) vars.push.apply(vars, Object.keys(arguments[i]));
    }
  }
  
  rules['"'] = function(stream, state) {
    return push(state, string)(stream, state);
  }
  rules['/'] = function(stream, state) {
    if (stream.eat('/')) {
      stream.skip();
      return 'comment';
    }
    if (stream.eat('*')) {
      return push(state, comment)(stream, state);
    }
  }
  rules['@'] = function(stream, state) {
    var word = stream.take(takeWordRgx);
    if (attributes[word]) {
      return 'directive';
    }
  }
  rules['('] = function(stream, state) {
    if (state.func) {
      pushcontext(state, FUNCTION);
    } else {
      pushcontext(state, FUNCTION_CALL);
    }
    return 'bracket';
  }
  rules[')'] = function(stream, state) {
    if (state.context.type === FUNCTION_CALL) {
      popcontext(state);
    }
    return 'bracket';
  }
  rules['{'] = function(stream, state) {
    if (state.func) {
      state.func = undefined;
    } else {
      pushcontext(state, BLOCK);
    }
    return 'bracket';
  }
  rules['}'] = function(stream, state) {
    if (state.context.type === BLOCK || state.context.type === FUNCTION) {
      popcontext(state);
    }
    return 'bracket';
  }
  
  function words(stream, state, ch) {
    var word = ch + stream.take(takeWordRgx);
    
    if (word === 'true' || word === 'false') return 'builtin boolean';
    if (word === 'nil') return 'constant';
    if (controls[word]) return 'control';
    if (keywords[word]) return 'keyword';
    if (builtins[word]) return 'builtin';
    
    if (stream.isAfter(':')) {
      if (state.context.type === FUNCTION_CALL) {
        return 'property';
      }
      if (state.context.type === FUNCTION) {
        saveVariable(state.context, word, 'param');
        return 'parameter';
      }
    }
    
    var lastValue = stream.lastValue;
    
    if (lastValue === 'class' || lastValue === 'protocol' || lastValue === 'extension') {
      saveVariable(state.context, word, 'class');
      return 'special';
    }
    if (lastValue === 'var' || lastValue === 'let') {
      saveVariable(state.context, word, lastValue);
      return 'variable';
    }
    if (lastValue === 'func') {
      saveVariable(state.context, word, 'func');
      state.func = true;
      return 'function';
    }
    if (stream.isAfter('(')) {
      return 'function';
    }
    return isVariable(state, word);
  }
  
  return new CodePrinter.Mode({
    lineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
    matching: 'brackets',
    
    initialState: function() {
      return {
        type: BLOCK,
        indent: 0,
        context: {
          indent: 0
        }
      }
    },
    iterator: function(stream, state) {
      var ch = stream.next(), rule = rules[ch];
      
      if (rule) {
        var token = rule(stream, state, ch);
        if (token) {
          return token;
        }
      }
      
      if (ch === '-' && stream.take(/^\d/) || /\d/.test(ch)) {
        if (ch === '0') {
          if (stream.eat('x')) {
            stream.take(/^[0-9a-f][0-9a-f_]*(\.[0-9a-f][0-9a-f_]*)?(p\-?\d[\d_]*)?/i);
            return 'numeric hex';
          }
          if (stream.eat('o')) {
            stream.take(/^[0-7][0-7_]*/);
            return 'numeric octal';
          }
          if (stream.eat('b')) {
            stream.take(/^[01][01_]*/);
            return 'numeric binary';
          }
        }
        stream.take(/^[\d_]*(\.\d[\d_]*)?([eE]\-?[\d_]+)?/);
        return 'numeric';
      }
      if (operators.test(ch)) {
        return 'operator';
      }
      if (wordRgx.test(ch)) {
        return words(stream, state, ch);
      }
    },
    onExit: function(stream, state) {
      state.indent = state.context.indent;
    },
    indent: function(stream, state) {
      var i = state.indent, peek = stream.peek();
      if (stream.lastSymbol === 'bracket' && stream.isAfter(closeBrackets)) return [i, -1];
      if (closeBrackets.test(peek)) {
        return i - 1;
      }
      return i;
    },
    completions: function(stream, state) {
      var vars = [];
      for (var ctx = state.context; ctx; ctx = ctx.prev) {
        pushVars(vars, ctx.var, ctx.let, ctx.param, ctx.class, ctx.func);
      }
      return vars;
    }
  });
});
