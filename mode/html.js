/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', ['JavaScript', 'CSS'], function(JavaScript, CSS) {

  var wordRgx = /[\w\-]/i
  , selfClosingTagsRgx = /^(area|base|br|c(ol|ommand)|embed|hr|i(mg|nput)|keygen|link|meta|param|source|track|wbr)$/i
  , matchTagNameRgx = /<\s*(\w+)\s*[^>]*>?$/
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator;

  function comment(stream, state) {
    if (stream.eatUntil(/\-\-\>/)) {
      pop(state);
    } else {
      stream.skip();
    }
    return 'comment';
  }
  function string(stream, state, escaped) {
    var esc = !!escaped, ch;
    while (ch = stream.next()) {
      if (ch === state.quote && !esc) break;
      if (esc = !esc && ch === '\\') {
        stream.undo(1);
        push(state, escapedString);
        return 'string';
      }
    }
    pop(state);
    state.quote = undefined;
    return ch ? 'string' : 'invalid';
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
  function cdata(stream, state) {
    while (ch = stream.next()) {
      if (ch === ']' && stream.match(/^\]>/, true)) {
        pop(state);
        return 'comment cdata';
      }
    }
    return 'comment cdata';
  }

  function pushcontext(state, name) {
    state.context = { type: 'tag', name: name, indent: state.indent + 1, prev: state.context }
  }
  function popcontext(state) {
    if (state.context.prev) state.context = state.context.prev;
  }

  return new CodePrinter.Mode({
    name: 'HTML',
    blockCommentStart: '<!--',
    blockCommentEnd: '-->',
    indentTriggers: /\//,
    autoCompleteTriggers: /</,
    matching: 'tags',

    initialState: function() {
      return {
        indent: 0,
        context: { name: null, indent: 0 }
      };
    },
    iterator: function(stream, state) {
      var ch = stream.next();

      if (state.bracketOpen) {
        if (state.tagName) {
          if (ch === '>') return this.closeBracket(stream, state);
          if (ch === '=') return 'operator';
          if (ch === '"' || ch === "'") {
            state.quote = ch;
            return push(state, string)(stream, state);
          }
          if (/[^\t\n\f \/]/.test(ch)) {
            stream.take(/^[^\t\n\f \/>"'=]+/);
            return 'property';
          }
        }
        else {
          if (/[a-z\-]/i.test(ch)) return this.tags(stream, state, ch);
          state.bracketOpen = false;
          this.undoLastToken('bracket');
        }
      }
      if (ch === '<') return this.openBracket(stream, state);
      if (ch === '&') return this.entity(stream);
    },
    onExit: function(stream, state) {
      state.indent = state.context.indent;
    },
    openBracket: function(stream, state) {
      if (stream.eat('!')) {
        if (stream.eatChain('--')) {
          return push(state, comment)(stream, state);
        }
        if (stream.eatChain('[CDATA[')) {
          return push(state, cdata)(stream, state);
        }
        if (stream.eatUntil(/>/)) {
          return 'special doctype';
        }
      }
      if (stream.eat('/')) state.closingTag = true;
      state.bracketOpen = true;
      return 'bracket';
    },
    closeBracket: function(stream, state) {
      if (!state.tagName) {
        state.bracketOpen = false;
        return 'invalid';
      }
      if (state.closingTag && state.tagName === state.context.name) popcontext(state);
      else if (!stream.isAfter('<')) {
        var tagName = state.tagName;

        if (tagName === 'style') {
          state.indent = state.context.indent;
          this.passthrough(CSS, state, function(stream, state) {
            return stream.peek() !== '<' || !stream.isAfter('</style');
          });
        }
        else if (tagName === 'script') {
          state.indent = state.context.indent;
          this.passthrough(JavaScript, state, function(stream, state) {
            return stream.peek() !== '<' || !stream.isAfter('</script');
          });
        }
      }
      state.bracketOpen = state.closingTag = false;
      state.tagName = undefined;
      return 'bracket';
    },
    tags: function(stream, state, ch) {
      var word = ch + stream.eatWhile(wordRgx);
      state.tagName = word;
      if (selfClosingTagsRgx.test(word)) {
        state.closingTag = true;
        return 'keyword self-close-tag';
      }
      if (state.closingTag) return 'keyword close-tag';
      pushcontext(state, word);
      return 'keyword open-tag';
    },
    entity: function(stream) {
      return stream.match(/^[^;]+;/, true) ? 'escaped' : 'invalid';
    },
    indent: function(stream, state) {
      var ctx = state.context;
      if (ctx.type === 'tag' && ctx.name === 'textarea') {
        return stream.indent;
      }
      if (stream.lastValue == '>' && stream.isAfter('<')) {
        return [state.indent, -1];
      }
      if (stream.isAfter(/^\s*<\//) || stream.peek() == '/' && stream.lastValue == '</') {
        return state.indent - 1;
      }
      return state.indent;
    },
    onCompletionChosen: function(choice) {
      if (/<\/[\w\-]*$/.test(this.caret.textBefore())) {
        this.insertText('>');
      }
    },
    keyMap: {
      '/': function(stream, state, caret) {
        if (this.getOption('insertClosingBrackets')) {
          if (stream.isBefore('<') && state.context.name) {
            return '/'+state.context.name+'>';
          }
        }
      }
    },
    snippets: {
      '<': function(stream, state) {
        if (state.context) {
          return '</'+state.context.name+'>';
        }
      }
    }
  });
});
