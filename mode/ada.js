/* CodePrinter - Ada mode */

CodePrinter.defineMode('Ada', function() {
    var types = ['access','array','decimal','digits','mod','protected','real','record']
    , controls = ['begin','case','do','end','else','elsif','for','goto','if','loop','procedure','task','when','while']
    , keywords = [
        'abort','abs','abstract','accept','aliased','all','and','at','body',
        'constant','declare','delay','delta','digits','end','entry',
        'exception','exit','function','generic','in','interface','is',
        'limited','new','not','of','or','others','out','overriding','package',
        'pragma','private','raise','range','rem','renames','requeue','return',
        'reverse','select','separate','some','subtype','synchronized','tagged',
        'terminate','then','type','until','use','with','xor'
    ]
    
    return new CodePrinter.Mode({
        name: 'Ada',
        keywords: new RegExp('^('+ keywords.join('|') +')$', 'i'),
        types: new RegExp('^('+ types.join('|') +')$', 'i'),
        controls: new RegExp('^('+ controls.join('|') +')$', 'i'),
        regexp: /\-\-|\b\w+\b|[^\w\s]|\b[\d\_]*\.?[\d\_]+\b|\b0x[\da-f\_]+\b/i,
        lineComment: '--',
        
        memoryAlloc: function() {
            return {
                variables: [],
                tasks: []
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
                    } else if (found.toLowerCase() === 'null') {
                        stream.wrap('builtin');
                    } else if (stream.isBefore(':') || stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isAfter(':') || memory.variables.indexOf(found) !== -1) {
                        stream.wrap('variable');
                        memory.variables.put(found);
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.types.test(found)) {
                        stream.wrap('keyword', 'type');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (memory.tasks.indexOf(found) >= 0 || stream.isBefore(/task\s*(type|body)/)) {
                        stream.wrap('special');
                        memory.tasks.put(found);
                    }
                } else if (this.operators[found]) {
                    stream.wrap('operator', this.operators[found]);
                } else if (this.punctuations[found]) {
                    stream.wrap('punctuation', this.punctuations[found]);
                } else if (this.expressions[found]) {
                    stream.eat(found, this.expressions[found].ending, function() {
                        this.tear().wrap('invalid');
                    }).applyWrap(this.expressions[found].classes);
                }
            }
            return stream;
        },
        codeCompletion: function(memory) {
            return [types, keywords, controls, memory.variables, memory.tasks];
        },
        expressions: {
            '--': { ending: /$/, classes: ['comment', 'line-comment'] },
            '"': { ending: /(^"|[^\\]"|\\{2}")/, classes: ['string', 'double-quote'] }
        }
    });
});