/* CodePrinter - Ruby mode */

CodePrinter.defineMode('Ruby', (function() {
    var kpf = function(e) {
        if (this.textBeforeCursor(2).toLowerCase() == 'en') {
            var bf = this.caret.textBefore().trim(),
                i = this.getIndentAtLine(this.caret.line()-1);
            
            this.caret.setTextBefore(this.tabString(i-1) + bf);
        }
        this.insertText(e.getCharCode() == 68 ? 'D' : 'd');
    };
    
    return {
        controls: ['end','if','else','elseif','def','undef','begin','for','do','while','case','unless','until','then'],
        keywords: ['public','private','protected','alias','and','break','class','defined?','ensure','in','loop','module','next','nil','not','or','redo','rescue','retry','return','self','super','when','yield'],
        specials: ['puts','gets','print','proc','lambda','eval','fail'],
        regexp: /\w+\??|=begin|[^\w\s\/]|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\/(.*)\/[gimy]{0,4}/,
        
        fn: function(stream) {
            var found;
            
            while (found = stream.match(this.regexp)) {
                if (!isNaN(found)) {
                    if (found.substr(0, 2).toLowerCase() == '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^\w+/.test(found)) {
                    found = found.toLowerCase();
                    if (found == 'true' || found == 'false') {
                        stream.wrap('boolean', found);
                    } else if (this.controls.indexOf(found) !== -1) {
                        stream.wrap('control', found);
                    } else if (this.keywords.indexOf(found) !== -1) {
                        stream.wrap('keyword', found);
                    } else if (this.specials.indexOf(found) !== -1) {
                        stream.wrap('special', found);
                    } else if (stream.isBefore('def') || stream.isAfter('(')) {
                        stream.wrap('fname', found);
                    } else if (stream.isBefore('.') || stream.isBefore(':')) {
                        stream.wrap('property', found);
                    } else {
                        stream.wrap('word', found);
                    }
                } else if (found.length == 1) {
                    if (this.punctuations.hasOwnProperty(found)) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.operators.hasOwnProperty(found)) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.brackets.hasOwnProperty(found)) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.chars[found].end, function() {
                            return this.wrap('invalid').reset();
                        }).applyWrap(this.chars[found].cls);
                    } else if (found == '#') {
                        stream.eatWhile(found, '\n').wrap('comment', 'line-comment');
                    } else {
                        stream.wrap('other');
                    }
                } else if (found[0] == '=') {
                    stream.eatWhile(found, '=end').wrap('comment', 'multiline-comment');
                } else if (found[0] == '/') {
                    stream.wrap('regexp', function(cls) {
                        return this.replace(/(\\.)/g, '</span><span class="cp-escaped">$1</span><span class="'+cls+'">');
                    });
                } else {
                    stream.wrap('other');
                }
            }
            return stream;
        },
        keypressMap: {
            68: kpf,
            100: kpf
        },
        comment: '#'
    };
})());