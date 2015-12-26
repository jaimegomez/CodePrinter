/* CodePrinter - Markdown Mode */

CodePrinter.defineMode('Markdown', function() {
  
  var OL_CONTEXT = 1
  , UL_CONTEXT = 2
  , brackets = /^[\[\]\(\)]/
  , listsRegexp = /^\s*([\*\+\-]|\d+\.)(\s|$)/
  , push = CodePrinter.helpers.pushIterator
  , pop = CodePrinter.helpers.popIterator;
  
  function comment(stream, state) {
    if (stream.skip('```', true)) {
      pop(state);
    } else {
      stream.skip();
    }
    return 'comment';
  }
  function link(stream, state) {
    stream.eatWhile(/[^\]]/);
    pop(state);
    return 'string';
  }
  function linkSrc(stream, state) {
    stream.eatWhile(/[^\)]/);
    pop(state);
    return 'special';
  }
  function emphasis(stream, state) {
    var ch, emp = state.emphasis, st = emp.style;
    while (ch = stream.next()) {
      if (ch == '*' || ch == '_' || ch == '~') {
        if (emp.inner && ch == emp.start[0] && (emp.start.length == 1 || stream.isAfter(ch))) {
          push(state, emphasisInnerEnd);
        } else if (emp.start.length == 1 && stream.isAfter(ch)) {
          if (ch != emp.start[0] || emp.prev) {
            state.emphasis = {
              style: st + ' bold',
              start: ch + ch,
              inner: true,
              prev: emp
            };
            push(state, emphasisInner);
          } else {
            pop(state);
          }
        } else if (emp.start.length == 2 && !stream.isAfter(ch)) {
          state.emphasis = {
            style: st + ' italic',
            start: ch,
            inner: true,
            prev: emp
          };
          push(state, emphasisInner);
        } else if (ch == '~' && ch != emp.start[0]) {
          state.emphasis = {
            style: st + ' strike',
            start: ch + ch,
            inner: true,
            prev: emp
          };
          push(state, emphasisInner);
        } else {
          pop(state);
        }
        stream.undo(1);
        break;
      }
    }
    return 'string '+st;
  }
  function emphasisInner(stream, state) {
    var ch = stream.next();
    pop(state);
    if (ch == '*' || ch == '_' || ch == '~') {
      if (state.emphasis.start.length == 2) stream.eat(ch);
      return 'parameter';
    }
  }
  function emphasisInnerEnd(stream, state) {
    var ch = stream.next();
    pop(state);
    if (ch == state.emphasis.start[0]) {
      if (state.emphasis.start.length == 2) stream.eat(ch);
      state.emphasis = state.emphasis.prev;
      return 'parameter';
    }
  }
  
  function pushcontext(stream, state, type) {
    if (state.context.indent == stream.indent) {
      popcontext(state);
    }
    state.context = {
      type: type,
      indent: stream.indent,
      prev: state.context
    };
  }
  function popcontext(state) {
    if (state.context.prev) {
      state.context = state.context.prev;
      return true;
    }
  }
  
  return new CodePrinter.Mode({
    name: 'Markdown',
    matching: 'brackets',
    
    initialState: function() {
      return {
        context: {
          indent: 0
        }
      }
    },
    onEntry: function(stream, state) {
      while (stream.indent < state.context.indent && popcontext(state));
      if (!stream.value) popcontext(state);
    },
    iterator: function(stream, state) {
      var ch = stream.next();
      if (ch == '`') {
        if (stream.match(/^``/, true)) {
          return comment(stream, state);
        }
        if (stream.skip('`', true)) {
          return 'comment';
        }
        return;
      }
      if (stream.pos == 1) {
        if (state.emphasis) state.emphasis = undefined;
        
        if (ch == '#') {
          var h = stream.eatWhile('#').length;
          stream.skip();
          return 'font-1' + Math.max(0, Math.min(6-h, 6)) + '0 namespace';
        }
        if (ch == '>') {
          stream.skip();
          return 'string';
        }
        if (ch == '+' || ch == '*' || ch == '-' && !stream.isAfter('-')) {
          if (state.context.type != UL_CONTEXT || stream.indent > state.context.indent) {
            pushcontext(stream, state, UL_CONTEXT);
          }
          return 'numeric hex';
        }
        if (ch == '-' || ch == '=') {
          stream.eatWhile(/[\-\=]/);
          return 'operator';
        }
        if (/\d/.test(ch)) {
          stream.take(/^\d*/);
          if (stream.eat('.')) {
            if (state.context.type != OL_CONTEXT || stream.indent > state.context.indent) {
              pushcontext(stream, state, OL_CONTEXT);
            }
          }
          return 'numeric';
        }
      }
      if (ch == '*' || ch == '_' || ch == '~') {
        var sem = ch;
        if (state.emphasis == null) {
          if (stream.eat(ch)) sem = ch + ch;
          if (ch == '~' && sem.length == 1) {
            return;
          }
          if (stream.rest().indexOf(sem) >= 0) {
            state.emphasis = {
              style: sem.length == 1 ? 'italic' : ch == '~' ? 'strike' : 'bold',
              start: sem
            }
            push(state, emphasis);
          } else if (ch == '*' && stream.pos == 1) {
            return 'numeric hex';
          }
        } else {
          if (state.emphasis.start.length == 2) stream.eat(ch);
          state.emphasis = undefined;
        }
        return 'parameter';
      }
      if (brackets.test(ch)) {
        if (ch == '[') state.link = true;
        if (ch == ']') state.link = false;
        if (ch == '(') push(state, linkSrc);
        return 'bracket';
      }
      if (ch == '!') {
        return 'directive';
      }
      if (state.link) {
        stream.eatWhile(/[\w\s]/);
        return 'string';
      }
    },
    indent: function(stream, state) {
      return state.context.indent;
    }
  });
});