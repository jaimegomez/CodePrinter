/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', {
    regexp: /<!--|<!\w+|<\/?|&.+;/,
    regexp2: /[\w\-]+|=|"|'|\b\w+\b|\/?\s*>/,
    
    fn: function() {
        var ret = '',
            pos, found;
        
        while((pos = this.search(this.regexp)) !== -1) {
            found = this.match(this.regexp)[0];
            
            ret += this.tear(pos);
            
            if (found[0] === '<') {
                if (found.substr(0, 2) === '<!') {
                    if (found === '<!--') {
                        ret += this.eat(found, '-->').wrap(['comment']);
                    } else {
                        ret += this.eat(found, '>').wrap(['special']);
                    }
                } else {
                    ret += this.eat(found).wrap(['broket', 'open']);
                    
                    if ((pos = this.search(/\w+/)) !== -1) {
                        found = this.match(/\w+/)[0];
                        ret += this.tear(pos);
                        ret += this.eat(found).wrap(['keyword', found]);
                    }
                    
                    while((pos = this.search(this.regexp2)) !== -1) {
                        found = this.match(this.regexp2)[0];
                        
                        ret += this.tear(pos);
                        
                        if (/^\w+$/.test(found)) {
                            ret += this.eat(found).wrap(['property', found]);
                        } else if (found === '=') {
                            ret += this.eat(found).wrap(['operator', 'equal']);
                        } else if (this.chars.hasOwnProperty(found)) {
                            ret += this.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                        } else if (found[found.length-1] === '>') {
                            ret += this.eat(found).wrap(['broket', 'close']);
                            break;
                        } else {
                            ret += this.eat(found).wrap(['other']);
                        }
                    }
                }
            } else if (found[0] === '&') {
                ret += this.eat(found).wrap(['escaped']);
            }
        }
        
        return ret + this;
    }
});