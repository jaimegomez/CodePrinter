'use strict';

CodePrinter.defineAddon('hints', function() {  
  var li_clone = document.createElement('li')
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
  
  var List = function() {
    this.seen = {};
    this.values = [];
  }
  
  List.prototype = {
    check: function(pattern, string, matcher, opt) {
      if (!this.seen.hasOwnProperty(string)) {
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
    var hints = this, active, visible, pattern;
    
    cp.hints = this;
    this.options = options || {};
    
    for (var key in defaults) {
      if (!this.options.hasOwnProperty(key)) {
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
    this.search = function() {
      if (cp.doc.carets.length > 1) return;
      
      var list = new List()
      , range = hints.options.range, limit = hints.options.limit
      , caret = cp.doc.carets[0]
      , wordRgx = getWordRgx(caret)
      , rgx = new RegExp(wordRgx.source, 'g')
      , wordBf = caret.match(wordRgx, -1, false)
      , wordAf = caret.match(wordRgx, 1, false)
      , curDL = caret.dl()
      , bf = caret.textBefore()
      , af = caret.textAfter()
      , ps = caret.getParserState()
      , matcher, dl, text, m, next, ph;
      
      pattern = (wordBf + wordAf).toLowerCase();
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
        loop(pattern ? bf.substr(0, bf.length - wordBf.length) + ' ' + af.substr(wordAf.length) : bf + af);
        
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
      return pattern ? list.sort() : list.values;
    }
    this.show = function(byWord) {
      var list = this.search(byWord);
      this.list.innerHTML = '';
      
      if (list && list.length) {
        for (var i = 0; i < list.length; i++) {
          var li = list[i], node = li_clone.cloneNode();
          node.innerHTML = li.html || li.value;
          node.setAttribute('data-value', li.value);
          this.list.appendChild(node);
        }
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
      visible = active = undefined;
      return this;
    }
    this.isVisible = function() {
      return !!visible;
    }
    this.choose = function(value) {
      if (cp.doc.carets.length > 1) return;
      var caret = cp.doc.carets[0]
      , word = getWordRgx(caret)
      , wbf = caret.match(word, -1, false)
      , waf = caret.match(word, 1, false)
      , currentWord = wbf + waf
      , ps = caret.getParserState();
      
      if (currentWord !== value) {
        var i = 0, head = caret.head();
        while (i < currentWord.length && currentWord[i] === value[i]) i++;
        cp.doc.replaceRange(value.substr(i), CodePrinter.pos(head.line, head.column - wbf.length + i), CodePrinter.pos(head.line, head.column + waf.length));
      } else {
        caret.moveX(waf.length);
      }
      if (ps.parser && ps.parser.onCompletionChosen) {
        if (ps.parser.onCompletionChosen.call(cp, value)) {
          CodePrinter.async(function() {
            hints.show();
          });
        }
      }
      cp.emit('autocomplete', value);
      return this;
    }
    
    cp.on({
      'documentChanged': function(oldDoc, newDoc) {
        oldDoc.removeOverlay(hints.overlay);
        newDoc.addOverlay(hints.overlay);
      },
      'pause': function() {
        if (this.doc.carets.length > 1) return;
        var ch = this.doc.carets[0].textBefore(1);
        if (!visible && hints.match(ch)) hints.show();
      },
      'change': function(doc, change) {
        if (!visible || this.doc.carets.length > 1) return;
        var caret = this.doc.carets[0];
        if (change.type === 'replace' && hints.match(caret.textBefore().slice(-1))) hints.show();
        else hints.hide();
      },
      'caretMoved': function(doc, caret) {
        if (doc.carets.length > 1) return hints.hide();
        var charBefore = caret.textBefore().slice(-1);
        if (!hints.match(charBefore)) hints.hide();
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
          hints.hide();
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
      , y = caret.totalOffsetY(true) + cp.doc.sizes.paddingTop + 2;
      
      if (y + container.offsetHeight > cp.dom.wrapper.offsetHeight) {
        y = caret.totalOffsetY() - container.offsetHeight - 2;
      }
      if (x + container.offsetWidth > cp.dom.wrapper.offsetWidth) {
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
  
  CodePrinter.registerCommand('showHints', function() {
    this.hints && this.hints.show();
  });
  
  return Hints;
});