/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', () => {
  const FAKE_CONTEXT = 0
  , BLOCK_CONTEXT = 1
  , FUNCTION_CONTEXT = 3
  , ARROW_CONTEXT = 7
  , OBJECT_CONTEXT = 8
  , ARRAY_CONTEXT = 16
  , CLASS_CONTEXT = 32
  , tokens = CodePrinter.tokens
  , wordRgx = /^[\w$\xa1-\uffff]+/
  , wordCharacterRgx = /[\w$\xa1-\uffff]/
  , operatorRgx = /^[+\-*&%=<>!?|~^]/
  , unaryOperators = /[\-\+!~]/
  , binaryOperators = /^[\-\+\*\/&|%<>^=]+/
  , closeBrackets = /^[}\]\)]/
  , controls = CodePrinter.keySet(['if','else','elseif','for','switch','while','do','try','catch','finally'])
  , constants = CodePrinter.keySet(['null','undefined','NaN','Infinity'])
  , rules = {}
  , keywords = CodePrinter.keySet([
    'var','let','const','return','new','case','continue','break','instanceof','typeof',
    'class','export','import','extends','yield','super','debugger','default','delete',
    'in','throw','void','with','of','public','private','package','protected','static',
    'interface','implements','await','async','enum'
  ])
  , specials = CodePrinter.keySet([
    'this','$','_','window','document','console','arguments','function','navigator',
    'global','module','Object','Array','String','Number','Function','RegExp','Date',
    'Boolean','Math','JSON','Proxy','Promise','Map','WeakMap','Set','WeakSet','Symbol',
    'Reflect','Error','EvalError','InternalError','RangeError','ReferenceError',
    'StopIteration','SyntaxError','TypeError','URIError'
  ]);

  function stringExpression(stream, state) {
    let esc = !!state.stringEscaped, ch;
    while (ch = stream.next()) {
      if (ch === state.stringType && !esc) break;
      if (esc = !esc && ch === '\\') {
        stream.undo(1);
        return this.next(tokens.string, escapedStringExpression, stringExpression);
      }
    }
    state.stringEscaped = esc;
    if (ch || !esc) {
      state.stringEscaped = state.stringType = null;
      this.push(afterExpression);
    }
    return ch ? tokens.string : tokens.invalid;
  }

  function templateStringExpression(stream, state) {
    let esc = !!state.stringEscaped, ch;
    while (ch = stream.next()) {
      if (ch === '`' && !esc) break;
      if (ch === '$' && stream.peek() === '{') {
        stream.undo(1);
        return this.next(tokens.string, stringInjection, templateStringExpression);
      }
      if (esc = !esc && ch === '\\') {
        stream.undo(1);
        return this.next(tokens.string, escapedStringExpression, templateStringExpression);
      }
    }
    state.stringEscaped = esc;
    if (ch) {
      this.push(afterExpression);
    }
    return tokens.string;
  }

  function stringInjection(stream) {
    if (stream.eatChain('${')) {
      return this.next(tokens.escaped, expression, closeStringInjection);
    }
    return stream.eatChain('}') ? tokens.escaped : tokens.string;
  }

  function closeStringInjection(stream) {
    if (stream.eat('}')) {
      return tokens.escaped;
    }
  }

  function escapedStringExpression(stream, state) {
    if (stream.eat('\\')) {
      const ch = stream.next();
      if (ch) {
        return tokens.escaped;
      }
      stream.undo(1);
    }
    state.stringEscaped = true;
  }

  function comment(stream) {
    if (stream.skipTo('*/')) {
      return tokens.comment;
    }
    return this.yield(tokens.comment);
  }

  function regexpExpression(stream, state) {
    let ch;
    while (ch = stream.next()) {
      if (ch === '\\' && !stream.eol()) {
        stream.undo(1);
        return this.next(tokens.regexp, escapedRegexpExpression);
      }
      if (ch === '/') {
        stream.take(/^[gimy]+/);
        return this.next(tokens.regexp, afterExpression);
      }
    }
    return this.next(tokens.regexp, afterExpression);
  }

  function escapedRegexpExpression(stream, state) {
    if (stream.eat('\\')) {
      const ch = stream.next();
      if (ch) {
        return this.next(tokens.escaped, regexpExpression);
      }
    }
    return this.next(null, regexpExpression);
  }

  function parameters(stream, state) {
    var ch = stream.next();
    if (ch) {
      if (ch === ')') {
        this.pop();
        return tokens.bracket;
      }
      if (ch === '.' && stream.eat('.') && stream.eat('.')) {
        return tokens.operator;
      }
      if (ch === ',' || ch === ' ') {
        return;
      }
      if (wordCharacterRgx.test(ch)) {
        var word = ch + stream.take(wordRgx);
        if (stream.eol()) this.pop();
        state.context.params[word] = true;
        return tokens.parameter;
      }
      stream.undo(1);
    }
    this.pop();
  }

  function variableDeclaration(stream, state) {
    const word = stream.take(wordRgx);

    this.push(maybeAssignment, variableDeclarationSeparator);

    if (controls[word] || keywords[word] || constants[word]) {
      return tokens.invalid;
    }
    saveWordAsVariable(this, word, state.context.declarationType);
    return state.context.declarationType === 'const' ? tokens.constant : tokens.variable;
  }

  function maybeAssignment(stream, state) {
    if (stream.eatChain('=')) {
      return this.next(tokens.operator, expression);
    }
    if (stream.eatChain('in') || stream.eatChain('of')) {
      return this.next(tokens.keyword, expression);
    }
  }

  function variableDeclarationSeparator(stream, state) {
    if (stream.eat(',')) {
      return this.next(tokens.punctuation, variableDeclaration);
    }
    state.context.declarationType = null;
    if (stream.eat(';')) {
      return tokens.punctuation;
    }
    return tokens.invalid;
  }

  function punctuation(char) {
    return function(stream) {
      if (stream.eat(char)) {
        return tokens.punctuation;
      }
    };
  }

  function identifier(stream) {
    /* TODO: destructuring
    if (stream.eat('{')) {

    }
    if (stream.eat('[')) {

    }
    */
    const word = stream.take(wordRgx);
    return tokens.word;
  }

  function wordExpression(stream, state) {
    const word = stream.current();

    if (word === 'true' || word === 'false') {
      return [tokens.builtin, tokens.boolean];
    }
    if (word === 'function') {
      this.pushContext(FUNCTION_CONTEXT);
      return this.next(tokens.special, functionDeclaration);
    }
    if (constants[word]) {
      return this.next(tokens.constant, afterExpression);
    }
    if (specials[word]) {
      return this.next(tokens.special, afterExpression);
    }
    if (keywords[word]) {
      return tokens.keyword;
    }
    if (stream.isAfter(/^\s*\(/)) {
      return this.next(tokens.function, afterExpression);
    }
    if (state.context && state.context.type !== OBJECT_CONTEXT) {
      const varType = this.getVariableType(word);
      if (varType) {
        const token = varType === 'constant' && word !== word.toUpperCase() ? tokens.variable : varType;
        return this.next(token, afterExpression);
      }
    }
    return this.next(tokens.word, afterExpression);
  }

  function expression(stream, state) {
    const ch = stream.next();
    const rule = rules[ch];
    const ruleResult = rule && this.fallback(rule);

    if (ruleResult !== undefined) {
      return ruleResult;
    }
    if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/, true);
      return this.next(tokens.numeric, afterExpression);
    }
    if (operatorRgx.test(ch)) {
      stream.take(operatorRgx);
      return this.yield(tokens.operator);
    }
    if (stream.take(wordRgx)) {
      return this.fallback(wordExpression);
    }
  }

  function afterExpression(stream) {
    if (stream.eatChain('.')) {
      return this.next(tokens.punctuation, propertyExpression);
    }
    if (stream.eatChain('(')) {
      this.pushContext(FAKE_CONTEXT);
      return this.next(tokens.bracket, functionCallParams);
    }
    if (stream.eatChain('?')) {
      return this.next(tokens.punctuation, expression, punctuation(':'), expression);
    }
    if (stream.eatChain('[')) {
      this.pushContext(ARRAY_CONTEXT); // should it be fake context?
      return this.next(tokens.bracket, expression, closePropertyBracket, afterExpression);
    }
    if (stream.take(binaryOperators)) {
      return this.next(tokens.operator, expression);
    }
    if (stream.eatChain('instanceof')) {
      return this.next(tokens.keyword, expression);
    }
  }

  function closePropertyBracket(stream) {
    if (stream.eatChain(']')) {
      this.popContext();
      return tokens.bracket;
    }
  }

  function propertyExpression(stream, state) {
    const word = stream.take(wordRgx);
    if (word) {
      const token = stream.isAfter(/^\s*\(/) ? tokens.function : tokens.property;
      return this.next(tokens.property, afterExpression);
    }
  }

  function closeBlock() {
    this.popContext();
    return this.fallback(statement);
  }

  function maybeElseIfControl(stream) {
    if (stream.eatChain('if')) {
      return this.next(tokens.control, controlStatement);
    }
    return this.use(controlStatement);
  }

  function mainIterator(stream, state) {
    if (state.context.type & BLOCK_CONTEXT && stream.eat('}')) {
      this.popContext();
      return tokens.bracket;
    }
    if (this.iterator === mainIterator) {
      return this.use(statement, mainIterator);
    } else {
      return this.use(statement);
    }
  }

  function statement(stream, state) {
    if (stream.eat(';')) {
      return tokens.punctuation;
    }

    const word = stream.take(wordRgx);

    if (word) {
      if (word === 'const' || word === 'let' || word === 'var') {
        state.context.declarationType = word;
        return this.next(tokens.keyword, variableDeclaration);
      }
      if (word === 'else') {
        return this.next(tokens.control, maybeElseIfControl);
      }
      if (word === 'for') {
        return this.next(tokens.control, forStatement);
      }
      if (word === 'return') {
        return this.next(tokens.keyword, expression);
      }
      if (controls[word]) {
        return this.next(tokens.control, controlStatement);
      }
      return this.fallback(wordExpression);
    }
    return this.fallback(expression);
  }

  function functionDeclaration(stream) {
    const word = stream.take(wordRgx);
    word && saveWordAsVariable(this, word, 'var');
    return this.next(word ? tokens.function : null, functionDeclarator);
  }

  function functionDeclarator(stream) {
    if (stream.eat('(')) {
      this.pushContext(FAKE_CONTEXT);
      return this.next(tokens.bracket, functionParams);
    }
    if (stream.eat('*')) {
      return tokens.punctuation;
    }
    this.popContext();
  }

  function functionParameter(stream, state) {
    const word = stream.take(wordRgx);
    saveWordAsVariable(this, word, 'var');
    return tokens.parameter;
  }

  function functionParams(stream, state) {
    if (stream.eat(')')) {
      this.popContext();
      return this.next(tokens.bracket, openBlock);
    }
    if (stream.eatChain('...')) {
      return this.next([tokens.operator, 'spread'], functionParameter, functionParams);
    }
    if (stream.eat(',')) {
      return this.yield(tokens.punctuation);
    }
    return this.use(functionParameter, functionParams);
  }

  function functionCallParams(stream) {
    if (stream.eat(')')) {
      this.popContext();
      return this.next(tokens.bracket, afterExpression);
    }
    if (stream.eatChain('...')) {
      return this.next([tokens.operator, 'spread'], expression, functionCallParams);
    }
    if (stream.eat(',')) {
      return this.yield(tokens.punctuation);
    }
    return this.use(expression, functionCallParams);
  }

  function openBlock(stream) {
    if (stream.eat('{')) {
      return this.next(tokens.bracket, mainIterator);
    }
    return this.use(statement, closeBlock);
  }

  function arrayExpression(stream, state) {
    if (stream.eat(']')) {
      this.popContext();
      return this.next(tokens.bracket, afterExpression);
    }
    if (stream.eat(',')) {
      return this.yield(tokens.punctuation);
    }
    return this.use(expression, arrayExpression);
  }

  function objectExpression(stream, state) {
    if (stream.eat('}')) {
      this.popContext();
      return tokens.bracket;
    }
    if (stream.eat(',')) {
      return this.yield(tokens.punctuation);
    }
    return this.use(objectKey);
  }

  function objectKey(stream) {
    // TODO: handle dynamic keys and strings
    const word = stream.take(wordRgx);
    if (word) {
      return this.next(tokens.property, punctuation(':'), expression, objectExpression);
    }
  }

  function importIterator(stream, state) {
    var ch = stream.next();

    if (ch === '{') {
      this.push(destructuring(ch));
      return tokens.bracket;
    }
    if (ch === '"' || ch === '\'') {
      return this.push(stringExpression(ch))(stream, state);
    }
    if (wordCharacterRgx.test(ch)) {
      var word = ch + stream.take(wordRgx);

      if (word === 'from' || word === 'as' || word === 'default') {
        return tokens.keyword;
      }
      return this.saveVariable(state, word, 'constant', BLOCK_CONTEXT);
    }
    if (ch === ';') {
      this.pop();
      return tokens.punctuation;
    }
  }

  function destructuring(firstChar) {
    var lastChar = firstChar === '[' ? ']' : '}';

    return function destructuringIterator(stream, state) {
      var ch = stream.next();

      if (ch === lastChar) {
        this.pop();
        return tokens.bracket;
      }
      if (ch === '{' || ch === '[') {
        this.push(destructuring(ch));
        return tokens.bracket;
      }
      if (ch === ',') {
        return tokens.punctuation;
      }
      if (wordCharacterRgx.test(ch)) {
        var word = ch + stream.take(wordRgx);

        if (firstChar === '{') {
          if (word === 'as') {
            return tokens.keyword;
          }
          if (stream.isAfter(/^\s*(:|as\b)/)) {
            return tokens.word;
          }
        }
        return saveWordAsVariable(state, word);
      }
    }
  }

  function controlStatement(stream) {
    this.pushContext(BLOCK_CONTEXT);
    if (stream.eat('(')) {
      this.pushContext(FAKE_CONTEXT);
      return this.next(tokens.bracket, expression, controlStatement);
    }
    if (stream.eat(')')) {
      this.popContext();
      return this.next(tokens.bracket, openBlock);
    }
  }

  function forStatement(stream) {
    if (stream.eat('(')) {
      this.pushContext(BLOCK_CONTEXT);
      return this.next(tokens.bracket, forStatementInner);
    }
  }

  function forStatementInner(stream) {
    if (stream.eat(')')) {
      this.popContext();
      return this.next(tokens.bracket, openBlock);
    }
    if (stream.eat(';')) {
      return this.yield(tokens.punctuation);
    }
    return this.use(statement, forStatementInner);
  }

  function closeFatArrow(stream, state) {
    if (state.fatArrow && state.context.type === ARROW_CONTEXT) {
      this.popContext();
      state.fatArrow = null;
    }
  }

  function saveWordAsVariable(task, word, type) {
    if (type === 'var') {
      return task.saveVariable(word, 'variable', FUNCTION_CONTEXT);
    }
    if (type === 'let') {
      return task.saveVariable(word, 'variable', BLOCK_CONTEXT);
    }
    if (type === 'const') {
      return task.saveVariable(word, 'constant', BLOCK_CONTEXT);
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

  function stringRule(ch) {
    return function(stream, state) {
      state.stringType = ch;
      return this.use(stringExpression);
    };
  }

  rules['"'] = stringRule('"');
  rules["'"] = stringRule("'");

  rules['/'] = function(stream, state) {
    if (stream.eat('/')) {
      stream.skip();
      return tokens.comment;
    }
    if (this.lastTokenIncludes('word', 'parameter', 'variable', 'numeric', 'constant') || stream.lastValue === ')') {
      return tokens.operator;
    }
    return this.use(regexpExpression);
  };

  rules['['] = function() {
    this.pushContext(ARRAY_CONTEXT);
    return this.next(tokens.bracket, arrayExpression);
  };

  rules['{'] = function() {
    this.pushContext(OBJECT_CONTEXT);
    return this.next(tokens.bracket, objectExpression);
  };

  rules['('] = function() {
    this.pushContext(FAKE_CONTEXT);
    return this.next(tokens.bracket, expression);
  };

  rules[')'] = function() {
    this.popContext();
    return this.next(tokens.bracket, afterExpression);
  };

  rules['`'] = function() {
    return this.use(templateStringExpression);
  };

  rules['0'] = function(stream) {
    if (stream.eat(/x/i)) {
      stream.take(/^[\da-f]+/i);
      return this.next([tokens.numeric, tokens.hex], afterExpression);
    }
    if (stream.eat(/o/i)) {
      stream.take(/^[0-7]+/);
      return this.next([tokens.numeric, tokens.octal], afterExpression);
    }
    if (stream.eat(/b/i)) {
      stream.take(/^[01]+/);
      return this.next([tokens.numeric, tokens.binary], afterExpression);
    }
  };

  function isMultilineIterator(iterator) {
    return iterator && [comment, stringExpression, templateStringExpression].indexOf(iterator) >= 0;
  }

  return {
    name: 'JavaScript',
    autoCompleteWord: /[\w_]+/,
    autoCompleteTriggers: /[\w_]/,
    indentTriggers: /[\}\]\)e]/,
    matching: 'brackets',
    skipSpaces: true,
    lineComment: '//',
    blockComment: {
      start: '/*',
      end: '*/',
    },

    initialState() {
      return {
        indent: 0,
        context: { type: BLOCK_CONTEXT, vars: {}, indent: 0 }
      };
    },

    beforeIterator(stream, state) {
      if (!isMultilineIterator(this.iterator) && stream.eatChain('/*')) {
        return this.use(comment);
      }
    },

    iterator: mainIterator,

    onExit(stream, state) {
      state.indent = state.context.indent;
    },

    indent(stream, state, nextIteration) {
      var i = state.indent, peek = stream.peek();
      if (this.lastTokenIncludes('bracket') && stream.isAfter(closeBrackets)) return [i, -1];
      if (closeBrackets.test(peek)) {
        if (peek === ')') return state.context.type === FAKE_CONTEXT ? i - 1 : null;
        if (peek === ']') return state.context.type === ARRAY_CONTEXT ? i - 1 : null;
        if (peek === '}') return state.context.type & 47 ? i - 1 : null;
        if (!/\bbracket\b/.test(nextIteration()) || stream.lastValue !== peek) return null;
      }
      if (peek === 'e') {
        return stream.isBefore('els') && this.lastTokenIncludes(tokens.control) ? i : null;
      }
      if (state.parser && stream.isAfter(/^\s*<\s*\/\s*script/i)) return i - 1;
      return i;
    },

    completions(stream, state) {
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
  };
});
