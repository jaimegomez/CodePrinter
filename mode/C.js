/* CodePrinter - C Mode */

CodePrinter.defineMode('C', {
	controls: ['if','else','elseif','for','switch','while','do'],
	keywords: ['return','new','using','namespace','this','sizeof','break','continue','static','struct','typedef','case','const','default','void','enum','extern','goto','register','union','auto','volatile'],
	types: ['int','double','short','long','char','float','bool','unsigned','signed','struct'],
	regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|"|'|{|}|\/|%|<|>|&|\||\.|,|:|;|\?|!/,
	
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
            	if (this.controls.indexOf(found) !== -1) {
					stream.wrap(['control', found]);
				} else if (this.keywords.indexOf(found) !== -1) {
					stream.wrap(['keyword', found]);
				} else if (this.types.indexOf(found) !== -1) {
					stream.wrap(['keyword', 'type', found]);
				} else if (stream.isAfter('(') || ['cout','cin'].indexOf(found) !== -1) {
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
			} else if (found === '"' || found === "'") {
                stream.eat(found, this.chars[found].end, function() {
                    return this.wrap(['invalid']).reset();
                }).wrap(this.chars[found].cls);
            } else if (this.chars.hasOwnProperty(found)) {
				stream.eatWhile(found, this.chars[found].end).wrap(this.chars[found].cls);
			} else if (this.punctuations.hasOwnProperty(found)) {
                stream.wrap(['punctuation', this.punctuations[found]]);
            } else if (this.operators.hasOwnProperty(found)) {
                stream.wrap(['operator', this.operators[found]]);
            } else if (this.brackets.hasOwnProperty(found)) {
                stream.wrap(this.brackets[found]);
            } else {
				stream.wrap(['other']);
			}
		}
		
		return stream;
	},
    comment: '//'
});