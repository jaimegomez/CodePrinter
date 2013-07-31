/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', {
    regexp: /<!--|<!\w+|<\/?|&.+;/,
    regexp2: /[\w\-]+|=|"|'|\b\w+\b|\/?\s*>/,
    
    fn: function(stream) {
        var pos, found;
        stream = stream || this.stream;
        
        while((pos = stream.search(this.regexp)) !== -1) {
            found = stream.match(this.regexp)[0];
            
            stream.tear(pos);
            
            if (found[0] === '<') {
                if (found.substr(0, 2) === '<!') {
                    if (found === '<!--') {
                        stream.eat(found, '-->').wrap(['comment']);
                    } else {
                        stream.eat(found, '>').wrap(['special']);
                    }
                } else {
                    stream.eat(found).wrap(['broket', 'open']);
                    
                    if ((pos = stream.search(/\w+/)) !== -1) {
                        found = stream.match(/\w+/)[0];
                        stream.tear(pos);
                        stream.eat(found).wrap(['keyword', found]);
                    }
                    
                    while((pos = stream.search(this.regexp2)) !== -1) {
                        found = stream.match(this.regexp2)[0];
                        
                        stream.tear(pos);
                        
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
                }
            } else if (found[0] === '&') {
                stream.eat(found).wrap(['escaped']);
            }
        }
        
        return stream;
    }
});