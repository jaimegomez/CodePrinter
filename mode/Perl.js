/* CodePrinter - Perl mode */

CodePrinter.defineMode('Perl', function() {
    var controls = ['do','else','elsif','for','foreach','if','unless','until','while']
    , keywords = ['and','cmp','continue','eq','exp','ge','gt','le','lock','lt','my','ne','no','or','package','q','qq','qr','qw','qx','s','sub','tr','use','xor','y']
    , specials = ['__DATA__','__END__','__FILE__','__LINE__','__PACKAGE__','CORE','STDIN','STDOUT','STDERR','print','printf','sprintf','return']
    
    return new CodePrinter.Mode({
        name: 'Perl',
        controls: new RegExp('^('+ controls.join('|') +')$', 'i'),
        keywords: new RegExp('^('+ keywords.join('|') +')$', 'i'),
        specials: new RegExp('^('+ specials.join('|') +')$', 'i'),
        regexp: /m(\W).*\1[gimy]{0,4}|\/.*\/[gimy]{0,4}|[\$\@\&\%]?\w+|[^\w\s\/]|\b[\d\_]*\.?[\d\_]+\b|\b0x[\da-fA-F\_]+\b/,
        lineComment: '#',
        
        memoryAlloc: function() {
            return {
                constants: []
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
                } else if (/^\w+$/.test(found)) {
                    if (/^(true|false)$/.test(found)) {
                        stream.wrap('builtin', 'boolean');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (stream.isBefore('sub') || stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isBefore(/\buse\s*constant\s*$/i) && memory.constants.indexOf(found) >= 0) {
                        memory.constants.put(found);
                        stream.wrap('constant');
                    } else if (stream.isBefore('use')) {
                        stream.wrap('special');
                    }
                } else if (found.length == 1) {
                    if (found == '#') {
                        stream.eat(found, /$/).wrap('comment', 'line-comment');
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.expressions[found].ending, function() {
                            this.tear().wrap('invalid');
                        }).applyWrap(this.expressions[found].classes);
                    }
                } else if (found[0] == '$' || found[0] == '@' || found[0] == '%') {
                    stream.wrap('variable');
                } else if (found[0] == '&') {
                    stream.wrap('function');
                } else if (/^m(\W)|^\//.test(found)) {
                    if (found[0] == 'm') {
                        found = found.substring(0, found.substr(2).search(new RegExp('(((\\\\\\\\)+|[^\\\\])'+RegExp.$1.escape()+'[gimy]{0,4})')) + RegExp.$1.length);
                    } else {
                        found = found.substring(0, found.search(/(((\\\\)+|[^\\])\/[gimy]{0,4})/) + RegExp.$1.length);
                    }
                    stream.eatGreedily(found).wrap('regexp').eatEach(/\\./).wrapAll('escaped');
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
});