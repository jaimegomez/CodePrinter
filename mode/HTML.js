/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', {
    regexp: /<!--|<!\w+|<\?|<\/?|&.+;/,
    regexp2: /[\w\-]+|=|"|'|\b\w+\b|<|\/?\s*>/,
    
    fn: function(stream) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (found.substr(0, 2) === '<!') {
                if (found === '<!--') {
                    stream.eat(found, '-->').wrap(['comment']);
                } else {
                    stream.eat(found, '>').wrap(['special', 'doctype']);
                }
            } else if (found.substr(0, 2) === '<?') {
                var s = stream.eat(found, '?>', true).createSubstream();
                
                if (s) {
                    CodePrinter.requireMode('PHP', function(php) {
                        stream.parseSubstream(s.index, php);
                    }, this);
                } else {
                    stream.wrap(['phptag']);
                }
            } else if (found[0] === '<') {
                stream.eat(found).wrap(['broket', 'open']);
                
                if (found = stream.match(/^\b\w+/)) {
                    stream.eat(found).wrap(['keyword', found]);
                } else 
                    continue;
                
                while (found = stream.match(this.regexp2)) {
                    if (found === '<') {
                        break;
                    }
                    if (/^\w+$/.test(found)) {
                        stream.eat(found).wrap(['property', found]);
                    } else if (found === '=') {
                        stream.eat(found).wrap(['operator', 'equal']);
                    } else if (this.chars.hasOwnProperty(found)) {
                        stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                    } else if (found[found.length-1] === '>') {
                        stream.eat(found).wrap(['broket', 'close']);
                        break;
                    } else {
                        stream.eat(found).wrap(['other']);
                    }
                }
            } else if (found[0] === '&') {
                stream.eat(found).wrap(['escaped']);
            }
        }
        
        return stream;
    },
    keydownMap: {
        13: function(e) {
            var t = this.textBeforeCursor().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0] : '');
            
            if (this.textBeforeCursor(1) === '>') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '<' && this.insertText(a, 1);
            } else {
                this.insertText(a);
            }
            this.update();
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
                z[z.length-1] !== '/' && sc.indexOf(m[1].toLowerCase()) === -1 ? this.insertText('</'+m[1]+'>', 1) : 0;
            }
            return false;
        }
    }
});