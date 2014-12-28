/* CodePrinter - SQL Mode */

CodePrinter.defineMode('SQL', function() {
    
    var keyMap = {}
    , indentIncrements = ['begin', 'case', 'else']
    , atoms = ['false','true','null','unknown']
    , builtins = [
        'bool','boolean','bit','blob','enum','long','longblob','longtext',
        'medium','mediumblob','mediumint','mediumtext','time','timestamp',
        'tinyblob','tinyint','tinytext','text','bigint','int','int1','int2',
        'int3','int4','int8','integer','float','float4','float8','double',
        'char','varbinary','varchar','varcharacter','precision','real','null',
        'date','datetime','year','unsigned','signed','decimal','numeric'
    ]
    , controls = [
        'begin','case','else','end','then','when'
    ]
    , operators = [
        'all','and','any','between','exists','in','like','not','or','is','unique'
    ]
    , keywords = [
        'add','alter','as','asc','by','clustered','collate','collation','collations',
        'column','columns','commit','constraint','count','create','declare','delete',
        'desc','distinct','drop','for','foreign','from','group','having','index',
        'insert','into','join','key','nonclustered','on','order','primary',
        'rollback','savepoint','select','set','table','to','trigger','union',
        'update','use','values','view','where'
    ];
    
    keyMap['D'] = keyMap['d'] = function(e) {
        if (this.options.autoIndent) {
            var bf = this.caret.textBefore();
            if (/^\s*en$/i.test(bf)) {
                var line = this.caret.line()
                , indent = this.getNextLineIndent(line-1);
                this.caret.setTextBefore(this.tabString(indent-1) + bf.trim());
            }
        }
    }
    
    return new CodePrinter.Mode({
        builtins: new RegExp('^('+builtins.join('|')+')$', 'i'),
        controls: new RegExp('^('+controls.join('|')+')$', 'i'),
        wordOperators: new RegExp('^('+operators.join('|')+')$', 'i'),
        keywords: new RegExp('^('+keywords.join('|')+')$', 'i'),
        regexp: /\/\*|\-\-|\b\d*\.?\d+\b|(\b|@)\w+\b|[^\w\s]/,
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '--',
        caseSensitive: false,
        
        parse: function(stream, memory) {
            var sb = stream.stateBefore, found, e;
            
            if (sb && sb.comment) {
                var e = this.expressions['/*'];
                stream.eatWhile(e.ending).applyWrap(e.classes);
                stream.isStillHungry() && stream.continueState();
            }
            
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
                } else if (/^\w+$/.test(found)) {
                    if (atoms.indexOf(found.toLowerCase()) >= 0) {
                        stream.wrap('builtin', 'atom');
                    } else if (this.builtins.test(found)) {
                        stream.wrap('builtin');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.wordOperators.test(found)) {
                        stream.wrap('operator');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isAfter('.') || stream.isBefore(/use\s+$/i)) {
                        stream.wrap('namespace');
                    } else if (!stream.sol() && (e = stream.last(2)) && !e.is('special')) {
                        stream.wrap('special');
                    }
                } else if (found.length === 1) {
                    if (found === '*') {
                        stream.wrap('parameter');
                    } else if (this.operators[found]) {
                        stream.wrap('operator');
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation');
                    } else if (this.brackets[found]) {
                        stream.wrap('bracket');
                    } else if (e = this.expressions[found]) {
                        stream.eat(found, e.ending, function() {
                            this.tear().wrap('invalid');
                        }).applyWrap(e.classes);
                    }
                } else if (found[0] === '@') {
                    stream.wrap('variable');
                } else if (e = this.expressions[found]) {
                    stream.eatGreedily(found, e.ending).applyWrap(e.classes);
                    stream.isStillHungry() && stream.setStateAfter('comment');
                }
            }
            
            return stream;
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            /\b\w+$/.test(textBefore);
            var word = RegExp.lastMatch.toLowerCase();
            if (word && indentIncrements.indexOf(word) >= 0) {
                return 1;
            }
            if (/^\s*then\s*.*$/i.test(textBefore)) {
                return -1;
            }
            if (/when\s*(.*)$/i.test(textBefore) && !/\bthen\b/.test(RegExp.$1) || /\,\s*$/.test(textBefore)) {
                return 1;
            }
            return 0;
        },
        keyMap: keyMap,
        extension: {
            selectionWrappers: {
                '`': '`'
            },
            expressions: {
                '--': {
                    ending: /$/,
                    classes: ['comment', 'line-comment']
                },
                '`': {
                    ending: /(^\`|[^\\]\`)/,
                    classes: ['string', 'backquote']
                }
            }
        }
    });
});