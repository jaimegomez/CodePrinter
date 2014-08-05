/* CodePrinter - Cpp Mode */

CodePrinter.defineMode('Cpp', function() {
    var controls = ['if','else','elseif','for','switch','while','do','try','catch']
    , types = [
        'void','int','double','short','long','char','float','bool','unsigned',
        'signed','enum','struct','class','char16_t','char32_t','wchar_t'
    ]
    , keywords = [
        'return','this','new','break','continue','case','sizeof','const','using',
        'namespace','alignas','alignof','and','and_eq','asm','auto','bitand','bitor',
        'compli','constexpr','const_cast','decltype','default','delete','dynamic_cast',
        'explicit','export','extern','friend','goto','inline','mutable','noexcept','not',
        'not_eq','nullptr','operator','or','or_eq','private','protected','public','register',
        'reinterpret_cast','static','static_assert','static_cast','template','thread_local',
        'throw','typedef','typeid','typename','union','virtual','volatile','xor','xor_eq'
    ]
    , includeMap = {
        'iostream': ['cin','cout','cerr','clog','wcin','wcout','wcerr','wclog'],
        'istream': ['istream','iostream','wistream','wiostream','basic_istream','basic_iostream','endl'],
        'ostream': ['ostream','wostream','basic_ostream','endl'],
        'cstdio': {
            constants: ['BUFSIZ','EOF','FILENAME_MAX','FOPEN_MAX','L_tmpnam','NULL','TMP_MAX'],
            types: ['FILE','fpos_t','size_t']
        },
        'cstdlib': {
            constants: ['EXIT_FAILURE','EXIT_SUCCESS','MB_CUR_MAX','NULL','RAND_MAX'],
            types: ['div_t','ldiv_t','lldiv_t','size_t']
        },
        'cstring': {
            specials: ['string'],
            constants: ['NULL'],
            types: ['size_t']
        },
        'array': ['array'],
        'deque': ['deque'],
        'forward_list': ['forward_list'],
        'list': ['list'],
        'map': ['map','multimap'],
        'queue': ['queue','priority_queue'],
        'set': ['set','multiset'],
        'stack': ['stack'],
        'unordered_map': ['unordered_map','unordered_multimap'],
        'unordered_set': ['unordered_set','unordered_multiset'],
        'vector': ['vector']
    }
    includeMap.iostream.union(includeMap.istream).union(includeMap.ostream);
    
    return new CodePrinter.Mode({
        name: 'Cpp',
        controls: new RegExp('^('+ controls.join('|') +')$'),
        keywords: new RegExp('^('+ keywords.join('|') +')$'),
        types: new RegExp('^('+ types.join('|') +')$'),
        regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
        lineComment: '//',
        
        memoryAlloc: function() {
            return {
                constants: [],
                specials: [],
                types: []
            }
        },
        parse: function(stream, memory) {
            var sb = stream.stateBefore, found;
            
            if (sb && sb.comment) {
                var e = this.expressions['/*'];
                stream.eatWhile(e.ending).applyWrap(e.classes);
                stream.isStillHungry() && stream.continueState();
            }
            
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
                } else if (/^\w+$/.test(found)) {
                    if (found == 'true' || found == 'false') {
                        stream.wrap('builtin', 'boolean');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.types.test(found)) {
                        stream.wrap('keyword', 'type');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isAfter('::')) {
                        stream.wrap('namespace');
                    } else if (memory.types.indexOf(found) >= 0) {
                        stream.wrap('keyword', 'type');
                    } else if (memory.constants.indexOf(found) >= 0) {
                        stream.wrap('constant');
                    } else if (memory.specials.indexOf(found) >= 0) {
                        stream.wrap('special');
                    } else if (stream.isBefore(/\(.*$/) && stream.isAfter(/^[^\)]*\)/)) {
                        stream.wrap('parameter');
                    }
                } else if (found[0] === '#') {
                    stream.wrap('special', 'directives');
                    if (found === '#include') {
                        var af = stream.after();
                        stream.eat(af).wrap('string');
                        var inc, m = af.match(/[\w\/\.]+/);
                        if (m && (inc = includeMap[m[0]])) {
                            if (inc instanceof Array) {
                                memory.specials.union(inc);
                            } else {
                                inc.constants && memory.constants.union(inc.constants);
                                inc.specials && memory.specials.union(inc.objects);
                                inc.types && memory.types.union(inc.types);
                            }
                        }
                    }
                } else if (found.length == 1) {
                    if (this.punctuations[found]) {
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
                } else if (this.expressions[found]) {
                    stream.eatGreedily(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                    found === '/*' && stream.isStillHungry() && stream.setStateAfter('comment');
                }
            }
            return stream;
        },
        codeCompletion: function(memory) {
            return [controls, types, keywords, memory.types, memory.constants, memory.specials];
        },
        snippets: {
            'out': 'cout << ',
            'in': 'cin >> ',
            'main': {
                content: 'int main(int argc, const char * argv[]) {}',
                cursorMove: -1
            }
        }
    });
});