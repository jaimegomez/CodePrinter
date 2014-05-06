/* CodePrinter - Java Mode */

CodePrinter.defineMode('Java', {
    controls: ['if','else','while','for','case','switch','try','catch','finally'],
    keywords: ['abstract','assert','break','class','const','continue','default','enum','extends','final','goto','implements','instanceof','interface','native','new','package','private','protected','public','return','static','strictfp','super','synchronized','this','throw','throws','transient','void','volatile'],
    types: ['byte','short','int','long','float','double','boolean','char'],
    specials: ['java','System','String'],
    regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
    comment: '//',
    
    alloc: function() {
        return {
            importClasses: []
        }
    },
    fn: function(stream, memory) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (!isNaN(found)) {
                if (found.substring(0, 2) === '0x') {
                    stream.wrap('numeric', 'hex');
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.wrap('numeric', 'int');
                    } else {
                        stream.wrap('numeric', 'float');
                    }
                }
            } else if (/^[a-zA-Z0-9\_]+$/.test(found)) {
                if (found == 'true' || found == 'false') {
                    stream.wrap('boolean');
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.wrap('control');
                } else if (this.types.indexOf(found) !== -1) {
                    stream.wrap('keyword', 'type');
                } else if (this.specials.indexOf(found) !== -1 || (!stream.isBefore('.') && !stream.isAfter(';') && memory.importClasses.indexOf(found) !== -1)) {
                    stream.wrap('special');
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.wrap('keyword');
                } else if (found == 'import') {
                    stream.wrap('keyword');
                    if (found = stream.match(/^.*[\s\.]([a-zA-Z0-9]+);$/, 1)) {
                        memory.importClasses.put(found);
                        stream.reset();
                    } else {
                        stream.restore();
                    }
                } else if (stream.isAfter('(')) {
                    stream.wrap('function');
                } else {
                    stream.wrap('other');
                }
            } else if (found.length == 1) {
                if (this.punctuations.hasOwnProperty(found)) {
                    stream.wrap('punctuation', this.punctuations[found]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.wrap('operator', this.operators[found]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.applyWrap(this.brackets[found]);
                } else if (found === '"' || found === "'") {
                    stream.eat(found, this.expressions[found].ending, function() {
                        return this.wrap('invalid').reset();
                    }).applyWrap(this.expressions[found].classes);
                } else {
                    stream.wrap('other');
                }
            } else if (this.expressions.hasOwnProperty(found)) {
                stream.eatWhile(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
            } else {
                stream.wrap('other');
            }
        }
        return stream;
    },
    snippets: [
        {
            trigger: 'print',
            content: 'System.out.print();',
            cursorMove: -2
        },
        {
            trigger: 'println',
            content: 'System.out.println();',
            cursorMove: -2
        }
    ]
});