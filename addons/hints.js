'use strict';

CodePrinter.defineAddon('hints', function() {  
  
  var li_clone = document.createElement('li')
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , defaults = {
    word: /[\w\-$]+/,
    range: 500,
    limit: 100,
    maxWidth: 300,
    maxHeight: 100,
    matcher: 'fuzzy',
    prefix: '<strong>',
    postfix: '</strong>'
  };
  
  function buildOverlay(hints) {
    hints.overlay = new CodePrinter.Overlay('cp-hint-overlay');
    hints.container = document.createElement('div');
    hints.container.className = 'cp-hint-container';
    hints.list = document.createElement('ul');
    hints.container.appendChild(hints.list);
    hints.overlay.node.appendChild(hints.container);
  }
  function rm(parent, child) {
    var next = child.nextElementSibling;
    parent.removeChild(child);
    return next;
  }
  function isOutOfLastMatch(match, head) {
    if (!match || CodePrinter.comparePos(match.from, head) > 0) return true;
    var cmp = CodePrinter.comparePos(head, match.to);
    return cmp > (head.line === match.to.line ? 1 : 0);
  }
  
  var List = function() {
    this.seen = {};
    this.values = [];
  }
  
  List.prototype = {
    check: function(pattern, string, matcher, opt) {
      if (!hasOwnProperty.call(this.seen, string)) {
        this.push(matcher(pattern, string, opt));
      }
    },
    push: function(result) {
      if (result) {
        this.seen[result.value] = result.score;
        this.values[this.values.length] = result;
      }
    },
    sort: function() {
      var seen = this.seen;
      return this.values.sort(function(a, b) {
        return seen[b.value] - seen[a.value];
      });
    },
    ignore: function(arr) {
      for (var i = 0; i < arr.length; i++) {
        this.seen[arr[i]] = 0;
      }
    }
  }
  
  var matchers = {
    'default': function(pattern, string) {
      return { value: string, score: 1 };
    },
    'fuzzy': function(pattern, string, opt) {
      var i = 0, j = 0, totalScore = 0, currScore = 0, l = string.length
      , compareString = string.toLowerCase(), result = []
      , opts = opt || {}, pre = opts.prefix || '', post = opts.postfix || '';
      
      for (; i < l; i++) {
        var ch = string[i];
        if (compareString[i] === pattern[j]) {
          result[result.length] = currScore === 0 ? pre + ch : ch;
          ++j;
          currScore += 1 + currScore;
        } else {
          result[result.length] = currScore > 0 ? post + ch : ch;
          currScore = 0;
        }
        totalScore += currScore;
      }
      if (currScore > 0) result[result.length] = post;
      
      if (j === pattern.length) {
        return { html: result.join(''), value: string, score: totalScore };
      }
    }
  }
  
  var Hints = CodePrinter.Hints = function(cp, options) {
    var hints = this, active, visible, pattern, lastMatch;
    
    cp.hints = this;
    this.options = options == '[object Object]' ? options : {};
    
    for (var key in defaults) {
      if (!hasOwnProperty.call(this.options, key)) {
        this.options[key] = defaults[key];
      }
    }
    
    buildOverlay(this);
    this.overlay.hide();
    if (cp.doc) cp.doc.addOverlay(this.overlay);
    
    if (this.options.maxWidth !== 300) this.container.style.maxWidth = this.options.maxWidth + 'px';
    if (this.options.maxHeight !== 100) this.container.style.maxHeight = this.options.maxHeight + 'px';
    
    function getWordRgx(caret) {
      var parser = caret.getParserState().parser;
      return parser && parser.autoCompleteWord || hints.options.word || defaults.word;
    }
    
    this.match = function(word) {
      var caret = cp.doc.carets[0], parser = caret.getParserState().parser;
      return parser.autoCompleteTriggers ? parser.autoCompleteTriggers.test(word) : this.options.word.test(word);
    }
    this.search = function(ignores) {
      if (cp.doc.carets.length > 1) return;
      
      var list = new List()
      , range = hints.options.range, limit = hints.options.limit
      , caret = cp.doc.carets[0]
      , wordRgx = getWordRgx(caret)
      , rgx = new RegExp(wordRgx.source, 'g')
      , find = cp.doc.findWord(caret.head())
      , curDL = caret.dl()
      , ps = caret.getParserState()
      , matcher, dl, text, m, next, ph;
      
      if (ignores) list.ignore(ignores);
      pattern = find.word.toLowerCase();
      matcher = matchers[pattern && this.options.matcher || 'default'];
      
      function loop(text) {
        while (m = rgx.exec(text)) {
          list.check(pattern, m[0], matcher, hints.options);
        }
      }
      
      if (ps.parser && ps.parser.completions && (ph = ps.parser.completions.call(cp, ps.stream, ps.state))) {
        var v = ph instanceof Array ? ph : ph.values;
        for (var i = 0; i < v.length; i++) {
          list.check(pattern, v[i], matcher, this.options);
        }
        if ('number' === typeof ph.search && ph.search > 1) {
          range = ph.search;
        }
      }
      if (!ph || ph.search) {
        loop(find.before + ' ' + find.after);
        
        for (var dir = 0; dir <= 1; dir++) {
          next = dir ? curDL.next : curDL.prev;
          dl = next.call(curDL);
          
          for (var i = 1; i < range && dl && list.values.length < limit; i++) {
            loop(dl.text);
            dl = next.call(dl);
          }
          limit = limit * 2;
        }
      }
      lastMatch = find;
      return pattern ? list.sort() : list.values;
    }
    this.show = function() {
      var list = this.search();
      
      if (list && list.length) {
        if (list.length === 1 && cp.doc.carets[0].wordAround() === list[0].value) {
          return this.hide();
        }
        
        var child = this.list.firstElementChild;
        for (var i = 0; i < list.length; i++) {
          var li = list[i], node = child || li_clone.cloneNode();
          node.innerHTML = li.html || li.value;
          node.setAttribute('data-value', li.value);
          if (!child) this.list.appendChild(node);
          else child = node.nextElementSibling;
        }
        while (child) child = rm(this.list, child);
        
        this.overlay.show();
        refreshPosition();
        setActive(this.list.children[0], true);
        visible = true;
      } else {
        this.hide();
      }
      return this;
    }
    this.hide = function() {
      this.overlay.hide();
      visible = active = lastMatch = undefined;
      return this;
    }
    this.isVisible = function() {
      return !!visible;
    }
    this.choose = function(value) {
      if (cp.doc.carets.length > 1) return;
      var caret = cp.doc.carets[0]
      , word = getWordRgx(caret)
      , wbf = caret.wordBefore()
      , waf = caret.wordAfter()
      , currentWord = wbf + waf
      , ps = caret.getParserState();
      
      if (currentWord !== value) {
        var i = 0, head = caret.head();
        while (i < currentWord.length && currentWord[i] === value[i]) i++;
        cp.doc.replaceRange(value.substr(i), CodePrinter.pos(head.line, head.column - wbf.length + i), CodePrinter.pos(head.line, head.column + waf.length));
      } else if (waf.length) {
        caret.moveX(waf.length);
      }
      if (ps.parser && ps.parser.onCompletionChosen) {
        ps.parser.onCompletionChosen.call(cp, value);
      }
      this.hide();
      cp.emit('autocomplete', value);
      return this;
    }
    
    cp.on({
      'documentChanged': function(oldDoc, newDoc) {
        if (oldDoc) oldDoc.removeOverlay(hints.overlay);
        newDoc.addOverlay(hints.overlay);
      },
      'keypress': function() {
        if (this.doc.carets.length > 1) return;
        var caret = this.doc.carets[0];
        if (hints.match(caret.textBefore(1))) hints.show();
        else hints.hide();
      },
      'caretMoved': function(doc, caret) {
        if (!visible || this.doc.carets.length > 1) return;
        var caret = this.doc.carets[0];
        if (isOutOfLastMatch(lastMatch, caret.head()) || !hints.match(caret.textBefore(1))) hints.hide();
      },
      'blur': function() {
        if (visible) hints.hide();
      },
      'scrollend': function() {
        if (visible) refreshPosition();
      },
      '[Up]': function(e) {
        if (visible) {
          var last = hints.list.lastChild;
          setActive(active && active.previousElementSibling || last, true);
          e.preventDefault();
        }
      },
      '[Down]': function(e) {
        if (visible) {
          var first = hints.list.firstChild;
          setActive(active && active.nextElementSibling || first, true);
          e.preventDefault();
        }
      },
      '[Enter]': function(e) {
        if (visible && active) {
          hints.choose(active.getAttribute('data-value'));
          e.preventDefault();
        }
      },
      '[Esc]': function(e) {
        if (visible) {
          hints.hide();
          e.preventDefault();
        }
      }
    });
    
    cp.registerKey('Ctrl Space', 'showHints');
    
    var stopprop = function(e) { e.stopPropagation(); };
    this.container.addEventListener('wheel', stopprop, false);
    this.container.addEventListener('mousewheel', stopprop, false);
    this.container.addEventListener('DOMMouseScroll', stopprop, false);
    
    this.container.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'LI') {
        hints.choose(e.target.getAttribute('data-value'));
        hints.hide();
        e.stopPropagation();
        return false;
      }
    }, false);
    this.container.addEventListener('mouseover', function(e) {
      if (e.target.tagName === 'LI') setActive(e.target);
    }, false);
    this.container.addEventListener('mouseout', function(e) {
      if (e.target.tagName === 'LI') setActive(null);
    }, false);
    
    function refreshPosition() {
      var caret = cp.doc.carets[0]
      , container = hints.container
      , x = caret.offsetX() - 4
      , y = caret.totalOffsetY() + 2;
      
      if (y + container.offsetHeight > cp.doc.scrollTop + cp.dom.scroll.offsetHeight) {
        y = caret.offsetY() - container.offsetHeight - 2;
      }
      if (x + container.offsetWidth > cp.doc.scrollLeft + cp.dom.scroll.offsetWidth) {
        x = x - container.offsetWidth;
      }
      container.style.top = y+'px';
      container.style.left = x+'px';
    }
    function setActive(li, scroll) {
      if (active) active.classList.remove('active');
      if (li) {
        (active = li).classList.add('active');
        if (scroll) hints.container.scrollTop = scrollTop(li);
      } else {
        active = null;
      }
    }
    function scrollTop(li) {
      var ot = li.offsetTop, st = hints.container.scrollTop, loh = li.offsetHeight, ch = hints.container.clientHeight;
      return ot < st ? ot : ot + loh < st + ch ? st : ot - ch + loh;
    }
    return this;
  }
  
  Hints.prototype = {
    setRange: function(range) {
      this.options.range = range;
    },
    setWordPattern: function(word) {
      this.options.word = word;
    }
  }
  
  Hints.addMatcher = function(name, func) {
    if ('string' === typeof name && 'function' === typeof func) {
      matchers[name] = func;
    }
  }
  
  CodePrinter.defineOption('hints', false, function(value, oldValue) {
    if (!value && oldValue) {
      //this.hints.clear();
      this.hints = undefined;
    } else if (value && !oldValue) {
      new Hints(this, value);
    }
  });
  CodePrinter.registerCommand('showHints', function() {
    this.hints && this.hints.show();
  });
  
  return Hints;
});
