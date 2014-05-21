/* CodePrinter - Perl mode */

CodePrinter.defineMode('Perl', {
    controls: ['do','else','elsif','for','foreach','if','unless','until','while'],
    keywords: ['and','cmp','continue','eq','exp','ge','gt','le','lock','lt','m','ne','no','or','package','q','qq','qr','qw','qx','s','sub','tr','xor','y'],
    specials: ['__DATA__','__END__','__FILE__','__LINE__','__PACKAGE__','CORE','print','return'],
    regexp: /[\$\@\&]?\w+|[^\w\s\/]|\b[\d\_]*\.?[\d\_]+\b|\b0x[\da-fA-F\_]+\b/,
    comment: '#',
    
    fn: function(stream) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (!isNaN(found.replace(/\./g, '').replace(/\_/g, ''))) {
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
                    stream.wrap('boolean');
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.wrap('control');
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.wrap('keyword');
                } else if (this.specials.indexOf(found) !== -1) {
                    stream.wrap('special');
                } else if (stream.isBefore('sub') || stream.isAfter('(')) {
                    stream.wrap('function');
                } else {
                    stream.wrap('word');
                }
            } else if (found.length == 1) {
                if (found == '#') {
                    stream.eatWhile(found, '\n').wrap('comment', 'line-comment');
                } else if (this.punctuations.hasOwnProperty(found)) {
                    stream.wrap('punctuation', this.punctuations[found]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.wrap('operator', this.operators[found]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.applyWrap(this.brackets[found]);
                } else if (found === '"' || found === "'") {
                    stream.eat(found, this.expressions[found].ending, function() {
                        return this.wrap('invalid').reset();
                    }).applyWrap(this.expressions[found].classes);
                }
            } else if (found[0] == '$' || found[0] == '@') {
                stream.wrap('variable');
            } else if (found[0] == '&') {
                stream.wrap('function');
            }
        }
        return stream;
    },
    extension: {
        operators: {
            '~': 'match'
        }
    }
});