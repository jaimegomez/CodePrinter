/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', {
    regexp: /<!--|<!\w+|<\/?|&.+;/,
    regexp2: /[a-zA-Z\-]+|=|"|'|<|\/?\s*>/,
    
    fn: function(stream) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (found.substr(0, 2) === '<!') {
                if (found === '<!--') {
                    stream.eat(found, '-->').wrap(['comment']);
                } else {
                    stream.eat(found, '>').wrap(['special', 'doctype']);
                }
            } else if (found[0] === '<') {
                stream.wrap(['broket', 'open']);
                
                if (found = stream.match(/^\b[a-zA-Z]+/)) {
                    stream.wrap(['keyword', found]);
                    
                    while (found = stream.match(this.regexp2)) {
                        if (found === '<') {
                            stream.revert();
                            break;
                        }
                        if (/^\w+$/.test(found)) {
                            stream.wrap(['property', found]);
                        } else if (found === '=') {
                            stream.wrap(['operator', 'equal']);
                        } else if (this.chars.hasOwnProperty(found)) {
                            stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                        } else if (found[found.length-1] === '>') {
                            stream.wrap(['broket', 'close']);
                            break;
                        } else {
                            stream.wrap(['other']);
                        }
                    }
                }
                !found && stream.restore();
            } else if (found[0] === '&') {
                stream.wrap(['escaped']);
            } else {
                stream.wrap(['other']);
            }
        }
        
        return stream;
    },
    keydownMap: {
        13: function(e) {
            var t = this.caret.textBefore().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0] : '');
            
            if (this.textBeforeCursor(1) === '>') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '<' && this.insertText(a, -a.length);
            } else {
                this.insertText(a);
            }
            return e.cancel();
        }
    },
    keypressMap: {
        62: function() {
            var t = this.textBeforeCursor(),
                m = t.match(/<\s*(\w+)\s*[^>]*$/);
            
            this.insertText('>');
            if (m && m[1]) {
                var sc = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'],
                    z = m[0].trim();
                z[z.length-1] !== '/' && sc.indexOf(m[1].toLowerCase()) === -1 ? this.caret.setTextAfter('</'+m[1]+'>@a') : 0;
            }
            return false;
        }
    }
});