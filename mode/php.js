/* CodePrinter - PHP Mode */

CodePrinter.defineMode('PHP', function() {

  var wordFirstLetterRgx = /[a-z_\x7f-\xff]/i
  , wordRgx = /[\w\x7f-\xff]/i
  , varnameRgx = /^[a-z_\x7f-\xff][\w\x7f-\xff]*/i
  , openBrackets = /^[{\[(]/
  , closeBrackets = /^[}\])]/
  , operatorsRgx = /[=!+\-\*\/%<>|&\.]/
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator
  , constants = ['__CLASS__','__DIR__','__FILE__','__FUNCTION__','__LINE__','__METHOD__','__NAMESPACE__','__TRAIT__']
  , controls = [
    'if','else','for','foreach','switch','case','default',
    'while','do','elseif','try','catch','finally','declare',
    'endif','endfor','endforeach','endswitch','endwhile','enddeclare'
  ]
  , keywords = [
    'abstract','and','array','as','break','class','clone','const','continue',
    'declare','default','extends','final','function','global','goto',
    'implements','interface','instanceof','namespace','new','or',
    'parent','private','protected','public','return','self','static',
    'throw','use','var','xor'
  ]
  , specials = [
    'define','defined','die','echo','empty','exit','eval','include','include_once',
    'isset','list','require','require_once','print','unset'
  ];

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
      state.quote = null;
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
    var star, ch;
    while (ch = stream.next()) {
      if (star && ch == '/') {
        break;
      }
      star = ch == '*';
    }
    if (ch && star) pop(state);
    return 'comment';
  }
  function namespace(stream, state) {
    stream.eatWhile(/[^\;]/);
    pop(state);
    return 'namespace';
  }

  function pushcontext(state) {
    state.context = { vars: {}, classes: {}, methods: {}, indent: state.indent + 1, prev: state.context };
  }
  function popcontext(state) {
    if (state.context.prev) {
      state.context = state.context.prev;
    }
  }
  function isInContext(varname, state, prop) {
    for (var ctx = state.context; ctx; ctx = ctx.prev) if (ctx[prop][varname] === true) return ctx[prop][varname];
  }

  return new CodePrinter.Mode({
    name: 'PHP',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
    lineComment: '//',
    indentTriggers: /[})\]efhr]/,
    matching: 'brackets',

    initialState: function() {
      return {
        indent: 0,
        context: { vars: {}, classes: {}, methods: {} }
      }
    },
    iterator: function(stream, state) {
      if (stream.pos == 0) state.namespace = state.classdef = undefined;
      var ch = stream.next();
      if (ch == '$') {
        var varname = stream.match(varnameRgx, true);
        if (varname) {
          if (varname == 'this') return 'special';
          state.context.vars[varname] = true;
          return 'variable';
        }
        return 'special';
      }
      if (ch == '"') {
        state.quote = ch;
        return push(state, string)(stream, state);
      }
      if (ch == '/' && stream.eat('*')) {
        return push(state, comment)(stream, state);
      }
      if (ch == '<' && stream.eat('?')) {
        stream.skip('php');
        ++state.indent;
        return 'external';
      }
      if (ch == '?' && stream.eat('>')) {
        --state.indent;
        return 'external';
      }
      if (ch == '_' && stream.eat('_') && stream.match(/^[A-Z]+__/, true)) {
        var constname = stream.from(stream.start);
        if (constants.indexOf(constname)) return 'builtin constant';
        return;
      }
      if (ch == '0' && stream.eat('x')) {
        stream.eatWhile(/[\da-f]/i);
        return 'numeric hex';
      }
      if (/\d/.test(ch)) {
        stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/, true);
        return 'numeric';
      }
      if (openBrackets.test(ch)) {
        if (ch == '{' && state.classdef) {
          pushcontext(state);
          state.classdef = undefined;
        }
        ++state.indent;
        return 'bracket';
      }
      if (closeBrackets.test(ch)) {
        if (ch == '}' && state.indent == state.context.indent) {
          popcontext(state);
        }
        --state.indent;
        return 'bracket';
      }
      if (operatorsRgx.test(ch)) {
        stream.eatWhile(operatorsRgx);
        return 'operator';
      }
      if (wordFirstLetterRgx.test(ch)) {
        var word = ch + stream.eatWhile(wordRgx);

        if (state.funcdef) {
          state.context.methods[word] = true;
          state.funcdef = undefined;
          return 'function';
        }
        if (state.classdef) {
          state.context.classes[word] = true;
          return 'special';
        }
        if (word == 'function') {
          state.funcdef = true;
          return 'keyword';
        }
        if (word == 'class') {
          state.classdef = true;
          return 'keyword';
        }
        if (word == 'namespace') {
          push(state, namespace);
          state.namespace = true;
          return 'keyword';
        }
        if (word == 'true' || word == 'false') return 'builtin boolean';
        if (word == 'null') return 'builtin';
        if (controls.indexOf(word) >= 0) return 'control';
        if (specials.indexOf(word) >= 0) return 'special';
        if (keywords.indexOf(word) >= 0) return 'keyword';
        if (stream.skip('::')) return 'namespace';

        if (isInContext(word, state, 'methods')) {
          return 'function';
        }
        if (isInContext(word, state, 'classes')) {
          return 'special';
        }
      }
    },
    indent: function(stream, state) {
      var i = state.indent;
      if (stream.lastStyle == 'bracket') {
        if (stream.isAfter(closeBrackets)) return [i, -1];
      }
      if (stream.isAfter(closeBrackets) || state.parser && stream.isAfter(/^\?>/i)) return i - 1;
      return i;
    },
    completions: function(stream, state) {
      var cc = [], fch = stream.lastValue && stream.lastValue[0];
      if (!fch || fch == '$') {
        for (var ctx = state.context; ctx; ctx = ctx.prev) {
          cc.push.apply(cc, Object.keys(ctx.vars));
        }
      }
      if (fch == '_') {
        cc.push.apply(cc, constants);
      }
      if (fch !== '$') {
        for (var ctx = state.context; ctx; ctx = ctx.prev) {
          cc.push.apply(cc, Object.keys(ctx.methods));
          cc.push.apply(cc, Object.keys(ctx.classes));
        }
      }
      return {
        values: cc,
        search: 100
      }
    }
  });
});
