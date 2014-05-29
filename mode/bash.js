/* CodePrinter - Bash mode */

CodePrinter.defineMode('Bash', {
    controls: ['case','do','done','elif','else','esac','fi','for','if','in','select','then','until','while'],
    keywords: ['break','continue','shift'],
    specials: ['$','echo','exit','function','print','printf','read'],
    regexp: /\$?\w+|[^\w\s\/]|\b[\d\_]*\.?[\d\_]+\b|\b0x[\da-fA-F\_]+\b/,
    comment: '#',
    
    alloc: function() {
        return {
            functions: []
        }
    },
    fn: function(stream, memory) {
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
                found = found.toLowerCase();
                if (found[0] === '$') {
                    stream.wrap('variable');
                } else if (found == 'true' || found == 'false') {
                    stream.wrap('boolean');
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.wrap('control');
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.wrap('keyword');
                } else if (this.specials.indexOf(found) !== -1) {
                    stream.wrap('special');
                } else if (stream.isAfter('=')) {
                    var af = stream.after();
                    stream.wrap('variable');
                    if (af.search(/^\s+\=|^\=\s+/) === 0) {
                        stream.eat(af[0], /(.)(?=[^\s\=])/).wrap('invalid');
                    }
                } else if (stream.isBefore('function')) {
                    stream.wrap('function');
                    memory.functions.put(found);
                } else if (memory.functions.indexOf(found) !== -1) {
                    stream.wrap('function');
                } else {
                    stream.wrap('word');
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
                } else if (this.punctuations.hasOwnProperty(found)) {
                    stream.wrap('punctuation', this.punctuations[found]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.wrap('operator', this.operators[found]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.applyWrap(this.brackets[found]);
                } else if (this.expressions.hasOwnProperty(found)) {
                    stream.eat(found, this.expressions[found].ending, function() {
                        return this.wrap('invalid').reset();
                    }).applyWrap(this.expressions[found].classes);
                }
            }
        }
        return stream;
    },
    extension: {
        onRemovedBefore: { '`': '`' },
        onRemovedAfter: { '`': '`' },
        expressions: {
            '`': { ending: /(^\`|[^\\]\`)/, classes: ['string', 'backquote'] }
        }
    }
});