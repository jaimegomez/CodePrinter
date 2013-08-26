/* CodePrinter - PHP Mode */

CodePrinter.defineMode('PHP', {
	controls: ['if','else','for','foreach','switch','case','while','do','elseif','try','catch','declare','endif','endfor','endforeach','endswitch','endwhile','enddeclare'],
	keywords: ['echo','return','break','continue','array','require','require_once','include','include_once','new','abstract','and','as','callable','clone','const','default','die','exit','extends','final','global','goto','implements','instanceof','insteadof','namespace','null','or','print','private','protected','public','static','use','var','xor'],
    specials: ['class','function','interface','trait','self','parent','super'],
    constants: ['__CLASS__','__DIR__','__FILE__','__FUNCTION__','__LINE__','__METHOD__','__NAMESPACE__','__TRAIT__'],
	regexp: /\$[\w\d\_]+|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\b\w+\b|\/\*|\/\/|["'{}\(\)\[\]\=\-\+\/%]|\b\w+(?=\()|\?>|<\?php|<\?=?|\.|,|:|;|\?|!|<|>|&|\|/,
	
	fn: function(stream) {
		var pos, found;
        
		while ((pos = stream.search(this.regexp)) !== -1) {
        	found = stream.match(this.regexp)[0];
            
            stream.tear(pos);
            
            if (found[0] === '$') {
            	stream.eat(found).wrap(['variable'])
            } else if (!isNaN(found)) {
                if(/^0x[\da-fA-F]+$/.test(found)) {
                    stream.eat(found).wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.eat(found).wrap(['numeric', 'int']);
                    } else {
                        stream.eat(found).wrap(['numeric', 'float']);
                    }
                }
            } else if (/^\w+$/i.test(found)) {
            	if (found == 'true' || found == 'false') {
            		stream.eat(found).wrap(['boolean', found.toLowerCase()]);
            	} else if (this.controls.indexOf(found) !== -1) {
            		stream.eat(found).wrap(['control', found]);
	            } else if (this.specials.indexOf(found) !== -1) {
                    stream.eat(found).wrap(['special'])
                } else if (this.keywords.indexOf(found) !== -1) {
	            	stream.eat(found).wrap(['keyword', found]);
	            } else if (/^\s*\(/.test(stream.substr(found.length))) {
            		stream.eat(found).wrap(['fname', found]);
            	} else if (this.constants.indexOf(found) !== -1) {
                    stream.eat(found).wrap(['const', found.replace(/_/g, '')]);
                } else {
	            	stream.eat(found).wrap(['word']);
	            }
            } else if (['?>','<?php','<?=','<?'].indexOf(found) !== -1) {
                stream.eat(found).wrap(['phptag', found == '?>' ? 'closetag' : 'opentag']);
            } else if (this.punctuations.hasOwnProperty(found)) {
                stream.eat(found).wrap(['punctuation', this.punctuations[found]]);
            } else if (this.operators.hasOwnProperty(found)) {
            	stream.eat(found).wrap(['operator', this.operators[found]]);
            } else if (this.brackets.hasOwnProperty(found)) {
                stream.eat(found).wrap(this.brackets[found]);
            } else if (this.chars.hasOwnProperty(found)) {
                stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else {
            	stream.eat(found).wrap(['other']);
            }
		}
		return stream;
	}
});