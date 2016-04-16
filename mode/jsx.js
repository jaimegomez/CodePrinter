/* CodePrinter - JSX mode */

CodePrinter.defineMode('JSX', ['JavaScript'], function(JavaScript) {

  var wordRgx = /[\w\-]/i;
  var Tokens = CodePrinter.Tokens;

  function pushcontext(state, type) {
    state.context = { type: type, prev: state.context, indent: state.indent + 1 };
  }
  function popcontext(state) {
    if (state.context.prev) {
      state.indent = state.context.indent - 1;
      state.context = state.context.prev;
    }
  }

  return new CodePrinter.Mode({
    name: 'JSX',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
    lineComment: '//',
    indentTriggers: /[\}\]\)\/]/,
    matching: ['brackets', 'tags'],

    onExit: JavaScript.onExit,
    completions: JavaScript.completions,
    snippets: JavaScript.snippets,

    initialState: function() {
      var state = JavaScript.initialState();
      state.tags = 0;
      return state;
    },
    iterator: function(stream, state) {
      var ch = stream.next(), ctx = state.context;

      if (ch === ' ' || ch === '\t') return;

      if (ch === '}' && ctx.type === 'js') {
        popcontext(state);
        return Tokens.bracket;
      }
      if (ctx.type === 'tag') {
        if (ch === '{') {
          pushcontext(state, 'js');
          return Tokens.bracket;
        }
        if (state.tags) {
          if (ch === '>') {
            if (state.closingTag) popcontext(state);
            state.closingTag = undefined;
            --state.tags;
            return Tokens.bracket;
          }
          if (ch === '/' && (stream.isAfter(/^\s*>/) || stream.lastValue === '<')) {
            state.closingTag = true;
            return;
          }
          if (/\w/.test(ch)) {
            var word = ch + stream.eatWhile(wordRgx);
            if (state.closingTag !== true) {
              if (ctx.name) return Tokens.property;
              ctx.name = word;
              return [Tokens.keyword, Tokens.openTag];
            } else if (word !== ctx.name) {
              popcontext(state);
              return Tokens.invalid;
            }
            return [Tokens.keyword, Tokens.closeTag];
          }
        }
      }
      if (ch === '<' && (!state.control || !ctx.type !== JavaScript.FAKE_CONTEXT) && stream.isAfter(/^\/?\w/)) {
        if (stream.eatUntil(/^\s*\//)) state.closingTag = true;
        else pushcontext(state, 'tag');
        ++state.tags;
        return Tokens.bracket;
      }

      stream.undo(1);
      return JavaScript.iterator(stream, state);
    },
    indent: function(stream, state, nextIteration) {
      var ch = stream.peek();
      if (stream.lastValue === '</' && ch === '/' && state.context.type === 'tag') return state.indent - 1;
      if (stream.isAfter(/^<\/\w+/)) return state.indent - 1;
      return JavaScript.indent(stream, state, nextIteration);
    },
    keyMap: {
      '/': function(stream, state, caret) {
        if (stream.lastValue === '<' && state.context.type === 'tag') {
          return '/' + state.context.name + '>';
        }
      }
    }
  });
});
