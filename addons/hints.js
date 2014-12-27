CodePrinter.defineAddon('hints', function() {
    
    var defaults = {
        word: /[\w\-$]+/,
        range: 500,
        limit: 100,
        maxWidth: 300,
        maxHeight: 100
    }
    , li_clone = document.createElement('li');
    
    var Hints = function(cp, options) {
        var that = this, active, container, visible, curWord;
        
        this.options = options = {}.extend(defaults, options); 
        cp.hints = this;
        
        this.overlay = cp.document.createOverlay('cp-hint-overlay', false);
        container = document.createElement('div');
        container.className = 'cp-hint-container';
        this.overlay.node.appendChild(container);
        
        this.overlay.on('refresh', function(a, e) {
            if (a === 'caretMove' && curWord) {
                var word = cp.wordBefore(options.word)+cp.wordAfter(options.word);
                if (word === curWord) {
                    that.show(false, word);
                } else {
                    that.hide();
                }
            } else if (a === 'changed') {
                !e.added || that.strictMatch(e.text) ? that.show(false) : that.hide();
            } else if (a === 'blur' || a === 'click') {
                that.hide();
            }
        });
        
        options.maxWidth != 300 && container.css('maxWidth', options.maxWidth);
        options.maxHeight != 100 && container.css('maxHeight', options.maxHeight);
        
        this.search = function() {
            var list = [], seen = {}
            , range = options.range, limit = options.limit
            , rgx = new RegExp(options.word.source, 'g')
            , wordBf = cp.wordBefore(options.word)
            , wordAf = cp.wordAfter(options.word)
            , caret = cp.caret
            , curDL = caret.dl()
            , bf = caret.textBefore()
            , af = caret.textAfter()
            , text = curDL.text
            , dl, text, m
            , next, hOP, fn;
            
            curWord = (wordBf + wordAf).toLowerCase();
            hOP = Object.prototype.hasOwnProperty;
            
            fn = curWord ? function(match) {
                var o = 0, m = 0, max = 0
                , l = curWord.length
                , lc = match.toLowerCase();
                
                for (var i = 0, l = curWord.length; i < l; i++) {
                    var j = lc.indexOf(curWord[i], o);
                    if (j == o) {
                        ++o;
                        max = Math.max(++m, max);
                    } else if (j > 0) {
                        m = 1;
                        o = j+1;
                    } else {
                        m = 0;
                    }
                }
                if (max >= Math.sqrt(l)) {
                    seen[match] = max;
                    list.push(match);
                } else {
                    seen[match] = null;
                }
            }
            : function(match) {
                seen[match] = true;
                list.push(match);
            }
            
            function loop() {
                while (m = rgx.exec(text)) {
                    if (!hOP.call(seen, m[0])) {
                        fn(m[0]);
                    }
                }
            }
            
            text = curWord ? bf.substr(0, bf.length - wordBf.length) + ' ' + af.substr(wordAf.length) : bf + af;
            loop();
            
            for (var dir = 0; dir <= 1; dir++) {
                next = dir ? curDL.next : curDL.prev;
                dl = next.call(curDL);
                
                for (var i = 1; i < range && dl && list.length < limit; i++) {
                    text = dl.text;
                    loop();
                    dl = next.call(dl);
                }
                limit = limit * 2;
            }
            return curWord ? list.sort(function(a, b) { return seen[b] - seen[a]; }) : list;
        }
        this.show = function(autocomplete, byWord, except) {
            var list = this.search(byWord), ul;
            
            if (except instanceof Array) {
                list.diff(except);
            }
            
            container.innerHTML = '<ul></ul>';
            ul = container.firstChild;
            
            if (list.length) {
                if (list.length == 1 && autocomplete !== false) {
                    return this.choose(list[0]);
                }
                for (var i = 0; i < list.length; i++) {
                    var li = li_clone.cloneNode();
                    li.innerHTML = list[i];
                    ul.appendChild(li);
                }
                this.overlay.reveal();
                refreshPosition();
                setActive(ul.children[0]);
                visible = true;
            } else {
                this.hide();
            }
            return this;
        }
        this.hide = function() {
            this.overlay.remove();
            visible = active = undefined;
            return this;
        }
        this.isVisible = function() {
            return visible;
        }
        this.choose = function(value) {
            var word = this.options.word
            , wbf = cp.wordBefore(word)
            , waf = cp.wordAfter(word);
            
            if (wbf + waf !== value) {
                cp.removeBeforeCursor(wbf);
                cp.removeAfterCursor(waf);
                cp.insertText(value);
            } else {
                cp.caret.moveX(waf.length);
            }
            cp.emit('autocomplete', value);
            return this;
        }
        
        cp.on({
            '@Up': function(e) {
                if (visible) {
                    var last = container.children[0].lastChild;
                    setActive(active && active.prev() || last, true);
                    return e.cancel();
                }
            },
            '@Down': function(e) {
                if (visible) {
                    var first = container.children[0].firstChild;
                    setActive(active && active.next() || first, true);
                    return e.cancel();
                }
            },
            '@Enter': function(e) {
                if (visible && active) {
                    that.choose(active.innerHTML);
                    that.hide();
                    return e.cancel();
                }
            },
            '@Esc': function(e) {
                if (visible) {
                    that.hide();
                    return e.cancel();
                }
            }
        });
        
        cp.registerKey({
            'Ctrl Space': function() {
                this.hints.show();
            }
        });
        
        container.delegate('li', {
            mousedown: function(e) {
                that.choose(this.innerHTML);
                that.hide();
                return e.cancel();
            },
            mouseover: function(e) {
                setActive(this);
            },
            mouseout: function(e) {
                setActive(null);
            }
        });
        
        function refreshPosition() {
            var x = cp.caret.offsetX() - 4
            , y = cp.caret.offsetY(true) + cp.sizes.paddingTop + 2;
            
            if (y + container.clientHeight > cp.wrapper.scrollHeight) {
                y = cp.caret.offsetY() - container.clientHeight - 2;
            }
            if (x + container.clientWidth > cp.wrapper.scrollWidth) {
                x = x - container.clientWidth;
            }
            
            container.style.top = y+'px';
            container.style.left = x+'px';
        }
        function setActive(li, scroll) {
            if (active) active.removeClass('active');
            if (li) {
                active = li.addClass('active');
                if (scroll) container.scrollTop = scrollTop(li);
            } else {
                active = null;
            }
        }
        function scrollTop(li) {
            var ot = li.offsetTop, st = container.scrollTop, loh = li.offsetHeight, ch = container.clientHeight;
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
        },
        match: function(word) {
            return this.options.word.test(word);
        },
        strictMatch: function(word) {
            return new RegExp('^'+this.options.word.source+'$').test(word);
        }
    }
    
    return Hints;
});