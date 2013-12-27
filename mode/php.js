/* CodePrinter - PHP Mode */

CodePrinter.defineMode('PHP', {
	controls: ['if','else','for','foreach','switch','case','while','do','elseif','try','catch','declare','endif','endfor','endforeach','endswitch','endwhile','enddeclare'],
	keywords: ['echo','return','break','continue','array','require','require_once','include','include_once','new','abstract','and','as','callable','clone','const','default','die','exit','extends','final','global','goto','implements','instanceof','insteadof','namespace','null','or','print','private','protected','public','static','use','var','xor'],
    specials: ['class','function','interface','trait','self','parent','super'],
    constants: ['__CLASS__','__DIR__','__FILE__','__FUNCTION__','__LINE__','__METHOD__','__NAMESPACE__','__TRAIT__'],
	regexp: /\$[\w\d\_]+|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\b\w+\b|\/\*|\/\/|\?>|<\?php|<\?=?|[^\w\s]/,
	
	fn: function(stream) {
		var found;
        
		while (found = stream.match(this.regexp)) {
            if (found[0] === '$') {
            	found == '$this' ? stream.wrap(['special', 'this']) : stream.wrap(['variable']);
            } else if (!isNaN(found)) {
                if (found.substr(0, 2).toLowerCase() == '0x') {
                    stream.wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.wrap(['numeric', 'int']);
                    } else {
                        stream.wrap(['numeric', 'float']);
                    }
                }
            } else if (/^\w+/i.test(found)) {
                found = found.toLowerCase();
            	if (found == 'true' || found == 'false') {
            		stream.wrap(['boolean', found]);
            	} else if (this.controls.indexOf(found) !== -1) {
            		stream.wrap(['control', found]);
	            } else if (this.specials.indexOf(found) !== -1) {
                    stream.wrap(['special', found]);
                } else if (this.keywords.indexOf(found) !== -1) {
	            	stream.wrap(['keyword', found]);
	            } else if (stream.isAfter('(')) {
            		stream.wrap(['fname', found]);
            	} else if (this.constants.indexOf(found) !== -1) {
                    stream.wrap(['const', found.replace(/_/g, '')]);
                } else {
	            	stream.wrap(['word']);
	            }
            } else if (found.length == 1) {
                if (this.operators.hasOwnProperty(found)) {
                    stream.wrap(['operator', this.operators[found]]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.wrap(this.brackets[found]);
                } else if (found == '"' || found == "'") {
                    stream.eatWhile(found, this.chars[found].end).wrap(this.chars[found].cls);
                } else {
                    stream.wrap(['punctuation', this.punctuations[found] || 'other']);
                }
            } else if (['?>','<?php','<?=','<?'].indexOf(found) !== -1) {
                stream.wrap(['phptag', found == '?>' ? 'closetag' : 'opentag']);
            } else if (this.chars.hasOwnProperty(found)) {
                stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else {
            	stream.wrap(['other']);
            }
		}
		return stream;
	},
    comment: '//'
});