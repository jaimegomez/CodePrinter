/* CodePrinter - Cpp Mode */

CodePrinter.defineMode('Cpp', {
	controls: ['if','else','elseif','for','switch','while','do','try','catch'],
	keywords: ['return','this','new','break','continue','case','sizeof','const','using','namespace','alignas','alignof','and','and_eq','asm','auto','bitand','bitor','compli','constexpr','const_cast','decltype','default','delete','dynamic_cast','explicit','export','extern','friend','goto','inline','mutable','noexcept','not','not_eq','nullptr','operator','or','or_eq','private','protected','public','register','reinterpret_cast','static','static_assert','static_cast','template','thread_local','throw','typedef','typeid','typename','union','virtual','volatile','xor','xor_eq'],
	types: ['void','int','double','short','long','char','float','bool','unsigned','signed','enum','struct','class','char16_t','char32_t','wchar_t'],
    specials: ['string','vector','ostream','istream','ofstream','ifstream'],
	regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
	comment: '//',
    
    alloc: function() {
        return {
            included: []
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
            } else if (/^\w+$/.test(found)) {
                if (found == 'true' || found == 'false') {
                    stream.wrap('boolean');
                } else if (this.controls.indexOf(found) !== -1) {
					stream.wrap('control');
				} else if (this.types.indexOf(found) !== -1) {
                    stream.wrap('keyword', 'type');
                } else if (this.specials.indexOf(found) !== -1 || memory.included.indexOf(found) !== -1) {
                    stream.wrap('special');
                } else if (this.keywords.indexOf(found) !== -1) {
					stream.wrap('keyword');
				} else if (stream.isAfter('(')) {
					stream.wrap('function');
				} else if (stream.isAfter('::')) {
                    stream.wrap('namespace');
                } else {
					stream.wrap('other');
				}
            } else if (found[0] === '#') {
				stream.wrap('special', 'directives');
				if (found === '#include') {
                    var af = stream.after();
					stream.eat(af).wrap('string');
                    var m = af.match(/[\w\/\.]+/);
                    m && m[0] in this.includes && memory.included.union(this.includes[m[0]]);
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
    includes: {
        'iostream': ['cin', 'cout','cerr','clog','wcin','wcout','wcerr','wclog','endl'],
        'istream': ['istream','iostream','wistream','wiostream','ws'],
        'ostream': ['ostream','wostream','endl','ends','flush'],
        'cstdio': ['print', 'printf', 'fprint', 'fprintf', 'scan', 'scanf', 'fscanf', 'puts', 'getc', 'gets', 'fclose'],
        'cstdlib': ['printf', 'calloc', 'malloc', 'realloc', 'free'],
        'map': ['map']
    },
    snippets: [
        {
            trigger: 'out',
            content: 'cout <<'
        },
        {
            trigger: 'in',
            content: 'cin >>'
        }
    ]
});