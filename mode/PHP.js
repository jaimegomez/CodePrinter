/* CodePrinter - PHP Mode */

CodePrinter.defineMode('PHP', {
	controls: ['if','else','for','foreach','switch','case','while','do','elseif','try','catch','declare','endif','endfor','endforeach','endswitch','endwhile','enddeclare'],
	keywords: ['abstract','and','array','as','break','callable','class','clone','const','continue','default','die','echo','exit','extends','final','function','global','goto','implements','include','include_once','instanceof','insteadof','interface','namespace','new','null','or','parent','print','private','protected','public','require','require_once','return','self','static','trait','use','var','xor'],
	specials: ['__CLASS__','__DIR__','__FILE__','__FUNCTION__','__LINE__','__METHOD__','__NAMESPACE__','__TRAIT__'],
	regexp: /\/\*|\$[\w\d\_]+|\{|\}|\(|\)|\[|\]|\=|\-|\+|\/|\%|\b[\w\d\_]+(?=\()|\b(\d*\.?\d+)\b|\b(0x[\da-fA-F]+)\b|<\?(php)*|<|>|\&|\||\?>|\b\w+\b/g,
	
	fn: function() {
		var ret = '',
			pos, found;
		
		while ((pos = this.search(this.regexp)) !== -1) {
        	found = this.match(this.regexp)[0];
            
            ret += this.tear(pos);
            
            if (found[0] === '$') {
            	ret += this.eat(found).wrap(['variable'])
            } else if (this.brackets.hasOwnProperty(found)) {
            	ret += this.eat(found).wrap(['bracket', this.brackets[found]+'bracket']);
            } else if (/^[\w\d\_]+$/i.test(found)) {
            	if (found == 'true' || found == 'false') {
            		ret += this.eat(found).wrap(['boolean', found.toLowerCase()]);
            	} else if (this.controls.indexOf(found) !== -1) {
            		ret += this.eat(found).wrap(['control', found]);
	            } else if (this.keywords.indexOf(found) !== -1) {
	            	ret += this.eat(found).wrap(['keyword', found]);
	            } else if (this.specials.indexOf(found) !== -1) {
	            	ret += this.eat(found).wrap(['special', 'const-'+found.replace('__', '')])
	            } else if (/^\s*\(/.test(this.substr(found.length))) {
            		ret += this.eat(found).wrap(['fname', found]);
            	} else {
	            	ret += this.eat(found).wrap(['word']);
	            }
            } else if (this.chars.hasOwnProperty(found)) {
            	ret += this.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else if (this.operators.indexOf(found) !== -1) {
            	ret += this.eat(found).wrap(['operator']);
            } else if (!isNaN(found)) {
                if(/^0x[\da-fA-F]+$/.test(found)) {
                    ret += this.eat(found).wrap(['numeric', 'hex']);
                } else {
                	if ((found+'').indexOf('.') === -1) {
                		ret += this.eat(found).wrap(['numeric', 'int']);
                	} else {
                    	ret += this.eat(found).wrap(['numeric', 'float']);
                	}
                }
            } else if (['<?php','<?','?>'].indexOf(found) !== -1) {
            	ret += this.eat(found).wrap(['phptag', found == '?>' ? 'closetag' : 'opentag']);
            } else {
            	ret += this.eat(found).wrap(['other']);
            }
		}
		return ret + this;
	}
});