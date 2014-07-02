/* CodePrinter - Bash mode */

CodePrinter.defineMode('Bash', function() {
    var controls = ['case','do','done','elif','else','esac','fi','for','if','in','select','then','until','while']
    , keywords = ['break','continue','shift']
    , specials = ['$','echo','exit','function','print','printf','read']
    , keyMap = {}
    
    keyMap['i'] = keyMap['c'] = keyMap['e'] = keyMap['f'] = function(e, k, ch) {
        var bf = this.caret.textBefore();
        if (this.parser.indentDecrements.indexOf(bf.split(/\s+/g).last()+ch) >= 0) {
            var line = this.caret.line()
            , indent = this.getNextLineIndent(line-1);
            this.caret.setTextBefore(this.tabString(indent-1) + bf.trim());
        }
    }
    
    return {
        controls: new RegExp('^('+ controls.join('|') +')$', 'i'),
        keywords: new RegExp('^('+ keywords.join('|') +')$', 'i'),
        specials: new RegExp('^('+ specials.join('|') +')$', 'i'),
        indentIncrements: ['then', 'do', 'in', 'else', 'elif', '{'],
        indentDecrements: ['fi', 'esac', 'done', 'else', 'elif', '}', ';;'],
        lineComment: '#',
        
        memoryAlloc: function() {
            return {
                functions: []
            }
        },
        parse: function(stream, memory) {
            var found;
            
            while (found = stream.match(this.regexp)) {
                if (!isNaN(found.replace(/\_/g, '.'))) {
                    if (found.substr(0, 2).toLowerCase() == '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^\$?\w+/.test(found)) {
                    if (found[0] === '$') {
                        stream.wrap('variable');
                    } else if (/^(true|false)$/i.test(found)) {
                        stream.wrap('builtin-constant', 'boolean');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (stream.isAfter('=')) {
                        var af = stream.after();
                        stream.wrap('variable');
                        if (af.search(/^\s+\=|^\=\s+/) === 0) {
                            stream.eat(af[0], /(.)(?=[^\s\=])/).wrap('invalid');
                        }
                    } else if (stream.isBefore('function') || memory.functions.indexOf(found) >= 0) {
                        stream.wrap('function');
                        memory.functions.put(found);
                    }
                } else if (found.length == 1) {
                    if (found == '$') {
                        stream.wrap('special');
                    } else if (found == '#') {
                        if (stream.isBefore(/^$|\s$/)) {
                            stream.eatWhile(found, '\n').wrap('comment', 'line-comment');
                        } else {
                            stream.wrap('operator');
                        }
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (this.expressions[found]) {
                        stream.eat(found, this.expressions[found].ending, function() {
                            return this.wrap('invalid').reset();
                        }).applyWrap(this.expressions[found].classes);
                    }
                }
            }
            return stream;
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var wordBefore = textBefore.split(/\s+/g).last()
            , wordAfter = textAfter.split(/\s+/g).first();
            if (parser.indentIncrements.indexOf(wordBefore) >= 0) {
                if (parser.indentDecrements.indexOf(wordAfter) >= 0) {
                    return [1, 0];
                }
                return 1;
            }
            if (parser.indentDecrements.indexOf(wordBefore) >= 0) {
                return -1;
            }
            if (/.+\)$/.test(textBefore) && textBefore.count(')') === 1) {
                return 1;
            }
            return 0;
        },
        keyMap: keyMap,
        extension: {
            onRemovedBefore: { '`': '`' },
            onRemovedAfter: { '`': '`' },
            expressions: {
                '`': { ending: /(^\`|[^\\]\`)/, classes: ['string', 'backquote'] }
            }
        }
    }
});