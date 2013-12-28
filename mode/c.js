/* CodePrinter - C Mode */

CodePrinter.defineMode('C', {
	controls: ['if','else','elseif','for','switch','while','do','try','catch'],
	keywords: ['return','this','new','break','continue','case','sizeof','const','using','namespace','alignas','alignof','and','and_eq','asm','auto','bitand','bitor','compli','constexpr','const_cast','decltype','default','delete','dynamic_cast','explicit','export','extern','friend','goto','inline','mutable','noexcept','not','not_eq','nullptr','operator','or','or_eq','private','protected','public','register','reinterpret_cast','static','static_assert','static_cast','template','thread_local','throw','typedef','typeid','typename','union','virtual','volatile','xor','xor_eq'],
	types: ['int','double','short','long','char','float','bool','unsigned','signed','enum','struct','class','char16_t','char32_t','wchar_t'],
    specials: ['cout','cin','endl','string','vector','ostream','istream','ofstream','ifstream'],
	regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
	
	fn: function(stream) {
		var found;
		
		while (found = stream.match(this.regexp)) {
			if (!isNaN(found)) {
                if (found.substring(0, 2) === '0x') {
                    stream.wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.wrap(['numeric', 'int']);
                    } else {
                        stream.wrap(['numeric', 'float']);
                    }
                }
            } else if (/^[a-zA-Z0-9\_]+$/.test(found)) {
                if (found == 'true' || found == 'false') {
                    stream.wrap(['boolean', found]);
                } else if (this.controls.indexOf(found) !== -1) {
					stream.wrap(['control', found]);
				} else if (this.types.indexOf(found) !== -1) {
                    stream.wrap(['keyword', 'type', found]);
                } else if (this.specials.indexOf(found) !== -1) {
                    stream.wrap(['special', found]);
                } else if (this.keywords.indexOf(found) !== -1) {
					stream.wrap(['keyword', found]);
				} else if (stream.isAfter('(')) {
					stream.wrap(['fname', 'fname-'+found]);
				} else {
					stream.wrap(['other']);
				}
            } else if (found[0] === '#') {
				var fo = found.substr(1);
				stream.wrap(['special', 'directives', fo]);
				if (fo === 'include') {
					stream.eat(stream.after()).wrap(['string']);
				}
			} else if (found.length == 1) {
                if (this.punctuations.hasOwnProperty(found)) {
                    stream.wrap(['punctuation', this.punctuations[found]]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.wrap(['operator', this.operators[found]]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.wrap(this.brackets[found]);
                } else if (found === '"' || found === "'") {
                    stream.eat(found, this.chars[found].end, function() {
                        return this.wrap(['invalid']).reset();
                    }).wrap(this.chars[found].cls);
                } else {
                    stream.wrap(['other']);
                }
            } else if (this.chars.hasOwnProperty(found)) {
				stream.eatWhile(found, this.chars[found].end).wrap(this.chars[found].cls);
			} else {
				stream.wrap(['other']);
			}
		}
		
		return stream;
	},
    comment: '//'
});