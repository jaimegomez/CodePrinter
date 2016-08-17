/* CodePrinter - Perl mode */

CodePrinter.defineMode('Perl', function() {

  var vartypes = /[\$\@\&\%\*]/
  , operators = /[+\-*&%=<>!?|~^]/
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator
  , controls = ['do','else','elsif','for','foreach','if','unless','until','while']
  , keywords = ['and','cmp','continue','eq','exp','ge','gt','le','lock','lt','ne','no','or','package','q','qq','qr','qw','qx','s','tr','xor','y']
  , specials = ['__DATA__','__END__','__FILE__','__LINE__','__PACKAGE__','CORE','STDIN','STDOUT','STDERR','print','printf','sprintf','return']

  function singleQuote(stream, state) {
    if (stream.skip("'")) {
      pop(state);
    }
    return 'string';
  }
  function doubleQuote(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch == '"' && !esc) break;
      if (esc = !esc && ch == '\\') {
        stream.undo(1);
        push(state, escapedString);
        return 'string';
      }
    }
    if (ch) pop(state);
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
    return doubleQuote(stream, state, true);
  }
  function comment(stream, state) {
    var ch = stream.next();
    if (ch == '=' && stream.pos == 1 && stream.indentation == 0 && stream.isAfter('cut')) {
      stream.undo(-3);
      pop(state);
    }
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
      if (ch == state.quote) {
        if (state.doubleRgx) {
          state.doubleRgx = undefined;
        } else {
          stream.take(/^[gimy]+/);
          state.quote = undefined;
          pop(state);
          return 'regexp';
        }
      }
    }
    return 'regexp';
  }
  function escapedRegexp(stream, state) {
    if (stream.eat('\\')) {
      var ch = stream.next();
      if (ch) {
        if (ch == 'x') stream.take(/^[0-9a-fA-F]{1,2}/);
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
      if (ch == ')') {
        pop(state);
        --state.indent;
        return 'bracket';
      }
      if (ch == '.' && stream.eat('.') && stream.eat('.')) {
        return 'operator';
      }
      if (ch == ',' || ch == ' ') {
        return;
      }
      if (/\w/.test(ch)) {
        var word = ch + stream.take(/^\w+/);
        if (stream.eol()) pop(state);
        state.context.params[word] = true;
        return 'parameter';
      }
      stream.undo(1);
    }
    pop(state);
    return;
  }

  function pushcontext(state, name) {
    state.context = { name: name, vars: {}, params: {}, indent: state.indent + 1, prev: state.context };
  }
  function popcontext(state) {
    if (state.context.prev) state.context = state.context.prev;
  }
  function isVariable(varname, state) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) if (ctx.vars[varname] === true) return 'variable';
  }

  return new CodePrinter.Mode({
    name: 'Perl',
    lineComment: '#',
    autoCompleteWord: /[\$\@\&\%\*]?[a-zA-Z]+/,
    autoCompleteTriggers: /[\$\@\&\%\*a-zA-Z]/,
    indentTriggers: /[\}\]\)]/,
    matching: 'brackets',

    initialState: function() {
      return {
        indent: 0,
        context: { vars: {}, params: {}, indent: 0 }
      }
    },
    iterator: function(stream, state) {
      var ch = stream.next();

      if (ch == "'") return push(state, singleQuote)(stream, state);
      if (ch == '"') return push(state, doubleQuote)(stream, state);

      if (ch == '#') {
        stream.skip();
        return 'comment';
      }
      if (ch == ';') {
        if (state.use) state.use = null;
        if (state.subdef) state.subdef = null;
        return 'punctuation';
      }
      if (ch == '/') {
        var ls = stream.lastStyle;
        if (ls == 'numeric' || ls == 'bracket' || ls == 'variable') return 'operator';
        state.quote = ch;
        return push(state, regexp)(stream, state);
      }
      if (/\d/.test(ch)) {
        if (ch == '0') {
          var p = stream.peek();
          if (p == 'x' && stream.take(/^x[0-9a-fA-F]+/)) return 'numeric hex';
          if (p == 'b' && stream.take(/^b[01]+/)) return 'numeric bin';
          if (stream.take(/^[0-7]+/)) return 'numeric oct';
        }
        stream.take(/^[\d\_]*(\.[\d\-]+)?/);
        return 'numeric';
      }
      if (/\w/.test(ch)) {
        var word = ch + stream.take(/^[\w]+/);
        if (word == 'true' || word == 'false') {
          return 'builtin boolean';
        }
        if (word == 'my') {
          state.vardef = true;
          return 'keyword';
        }
        if (word == 'sub') {
          state.subdef = true;
          return 'keyword';
        }
        if (state.subdef === true) {
          state.subdef = word;
          pushcontext(state, word);
          return 'function';
        }
        if (word == 'use') {
          state.use = true;
          return 'keyword';
        }
        if (word == 'm' || word == 's') {
          var p = stream.peek();
          if (p && /[^\w\s]/.test(p)) {
            stream.next();
            state.quote = p;
            state.doubleRgx = word == 's';
            return push(state, regexp)(stream, state);
          }
        }
        if (controls.indexOf(word) >= 0) return 'control';
        if (keywords.indexOf(word) >= 0) return 'keyword';
        if (specials.indexOf(word) >= 0) return 'special';

        if (stream.isAfter(/^\s*\(/)) return 'function';
        if (stream.isAfter('::')) return 'namespace';
        if (state.use) return stream.lastStyle == 'namespace' ? 'special' : 'directive';
      }
      if (ch == '}' || ch == ')' || ch == ']') {
        if (ch == '}' && state.indent == state.context.indent) {
          popcontext(state);
        }
        --state.indent;
        return 'bracket';
      }
      if (ch == '{' || ch == '(' || ch == '[') {
        if (state.subdef && ch == '(') push(state, parameters);
        ++state.indent;
        return 'bracket';
      }
      if (vartypes.test(ch)) {
        var word = ch + stream.take(/^[\$\@\&\%\*]*\w+/);
        if (word.length > 1) {
          if (ch == '&') return 'function';
          if (state.vardef) {
            state.vardef = null;
            state.context.vars[word] = true;
          }
          return 'variable';
        }
      }
      if (ch == '=' && stream.pos == 1 && stream.indentation == 0) {
        stream.skip();
        push(state, comment);
        return 'comment';
      }
      if (operators.test(ch)) {
        stream.eatWhile(operators);
        return 'operator';
      }
    },
    indent: function(stream, state) {
      var i = state.indent;
      if (stream.lastStyle == 'bracket' && stream.isAfter(/^[\}\)\]]/)) return [i, -1];
      if (stream.isAfter(/^[\}\)\]]/)) return i - 1;
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
    }
  });
});
