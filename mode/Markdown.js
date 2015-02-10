/* CodePrinter - Markdown Mode */

CodePrinter.defineMode('Markdown', function() {
  
  var brackets = /^[\[\]\(\)]/
  , listsRegexp = /^\s*([\*\+\-]|\d+\.)(\s|$)/;
  
  function comment(stream, state) {
    if (stream.skip('```', true)) {
      state.next = undefined;
    } else {
      state.next = comment;
    }
    return 'comment';
  }
  function link(stream, state) {
    stream.eatWhile(/[^\]]/);
    state.next = undefined;
    return 'string';
  }
  function linkSrc(stream, state) {
    stream.eatWhile(/[^\)]/);
    state.next = undefined;
    return 'special';
  }
  function emphasis(stream, state) {
    var ch, emp = state.emphasis, st = emp.style;
    while (ch = stream.next()) {
      if (ch == '*' || ch == '_' || ch == '~') {
        if (emp.inner && ch == emp.start[0] && (emp.start.length == 1 || stream.isAfter(ch))) {
          state.next = emphasisInnerEnd;
        } else if (emp.start.length == 1 && stream.isAfter(ch)) {
          if (ch != emp.start[0] || emp.prev) {
            state.emphasis = {
              style: st + ' bold',
              start: ch + ch,
              inner: true,
              prev: emp
            }
            state.next = emphasisInner;
          } else {
            state.next = undefined;
          }
        } else if (emp.start.length == 2 && !stream.isAfter(ch)) {
          state.emphasis = {
            style: st + ' italic',
            start: ch,
            inner: true,
            prev: emp
          }
          state.next = emphasisInner;
        } else if (ch == '~' && ch != emp.start[0]) {
          state.emphasis = {
            style: st + ' strike',
            start: ch + ch,
            inner: true,
            prev: emp
          }
          state.next = emphasisInner;
        } else {
          state.next = undefined;
        }
        stream.undo(1);
        break;
      }
    }
    return 'string '+st;
  }
  function emphasisInner(stream, state) {
    var ch = stream.next();
    state.next = emphasis;
    if (ch == '*' || ch == '_' || ch == '~') {
      if (state.emphasis.start.length == 2) stream.eat(ch);
      return 'parameter';
    }
  }
  function emphasisInnerEnd(stream, state) {
    var ch = stream.next();
    state.next = emphasis;
    if (ch == state.emphasis.start[0]) {
      if (state.emphasis.start.length == 2) stream.eat(ch);
      state.emphasis = state.emphasis.prev;
      return 'parameter';
    }
  }
  
  return new CodePrinter.Mode({
    name: 'Markdown',
    matching: 'brackets',
    
    initialState: function() {
      return {
        indent: 0
      }
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
          stream.skip();
          return 'namespace';
        }
        if (ch == '>') {
          stream.skip();
          return 'string';
        }
        if (ch == '+' || ch == '-' && !stream.isAfter('-')) {
          return 'numeric hex';
        }
        if (ch == '-' || ch == '=') {
          stream.eatWhile(/[\-\=]/);
          return 'operator';
        }
        if (/\d/.test(ch)) {
          stream.match(/^\d*\.?/, true);
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
            state.next = emphasis;
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
        if (ch == '(') state.next = linkSrc;
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
      return state.indent;
    }
  });
  // afterEnterKey: function(bf, af) {
  //   if (listsRegexp.test(bf)) {
  //     var sign = RegExp.$1;
  //     if (isNaN(sign)) {
  //       this.insertText(sign+' ');
  //     } else {
  //       this.insertText(parseInt(sign)+1 + '. ');
  //     }
  //   }
  // },
  // fixIndent: function(dl, expectedIndent) {
  //   var txt = dl.text, listType = typeOfList(txt);
    
  //   if (listType) {
  //     var prev = dl.prev()
  //     , bftype = prev && typeOfList(prev.text);
      
  //     if (bftype) {
  //       if (prev.parentalListItem) {
  //         if (listType !== bftype) {
  //           var p = levelOfParentalItem(listType, prev.parentalListItem);
  //           if (p >= 0) {
  //             return expectedIndent - p - 1;
  //           }
  //           dl.parentalListItem = prev;
  //           return expectedIndent + 1;
  //         }
  //         dl.parentalListItem = prev.parentalListItem;
  //         return expectedIndent;
  //       } else if (listType !== bftype) {
  //         dl.parentalListItem = prev;
  //         return expectedIndent + 1;
  //       }
  //     }
  //   }
  //   if (dl.parentalListItem) delete dl.parentalListItem;
  //   return 0;
  // }
});