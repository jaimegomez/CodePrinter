/* CodePrinter - Ada mode */

CodePrinter.defineMode('Ada', {
    keywords: ['abort','abs','abstract','accept','aliased','all','and','at','body','constant','declare','delay','delta','digits','end','entry','exception','exit','function','generic','in','interface','is','limited','new','not','of','or','others','out','overriding','package','pragma','private','raise','range','rem','renames','requeue','return','reverse','select','separate','some','subtype','synchronized','tagged','terminate','then','type','until','use','with','xor'],
    types: ['access','array','decimal','digits','mod','protected','real','record'],
    controls: ['begin','case','do','end','else','elsif','for','goto','if','loop','procedure','task','when','while'],
    regexp: /\-\-|\b\w+\b|[^\w\s]|\b[\d\_]*\.?[\d\_]+\b|\b0x[\da-fA-F\_]+\b/,
    comment: '--',
    
    alloc: function() {
        return {
            variables: [],
            tasks: []
        }
    },
    fn: function(stream, memory) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            found = found.toLowerCase();
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
                if (found in this.words) {
                    stream.wrap(this.words[found]);
                } else if (stream.isBefore(':') || stream.isAfter('(')) {
                    stream.wrap('function');
                } else if (stream.isAfter(':') || memory.variables.indexOf(found) !== -1) {
                    stream.wrap('variable');
                    memory.variables.put(found);
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.wrap('control');
                } else if (this.types.indexOf(found) !== -1) {
                    stream.wrap('keyword', 'type');
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.wrap('keyword');
                } else if (memory.tasks.indexOf(found) !== -1 || stream.isBefore(/task\s*(type|body)/)) {
                    stream.wrap('special');
                    memory.tasks.put(found);
                }
            } else if (this.operators.hasOwnProperty(found)) {
                stream.wrap('operator', this.operators[found]);
            } else if (this.punctuations.hasOwnProperty(found)) {
                stream.wrap('punctuation', this.punctuations[found]);
            } else if (this.expressions.hasOwnProperty(found)) {
                stream.eat(found, this.expressions[found].ending, function() {
                    return this.wrap('invalid').reset();
                }).applyWrap(this.expressions[found].classes);
            }
        }
        return stream;
    },
    expressions: {
        '--': { ending: '\n', classes: ['comment', 'line-comment'] },
        '"': { ending: /(^"|[^\\]"|\\{2}")/, classes: ['string', 'double-quote'] }
    },
    words: {
        'null': 'empty-value',
        'true': 'boolean',
        'false': 'boolean',
        'ada': 'special'
    }
});