/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', {
    controls: ['if','else','elseif','for','switch','while','do'],
    keywords: ['this','return','new','continue','break','instanceof','typeof','case','try','catch','debugger','default','delete','finally','in','throw','void','with'],
    specials: ['window','document','console','arguments','function','Object','Array','String','Number','Function','Math','JSON','RegExp','Node','HTMLElement','Boolean','$','jQuery','Selector'],
    
    regexp: /\/\*|\/\/|\\|"|'|\/(.*)\/[gimy]{0,4}|\{|\}|\(|\)|\[|\]|\=|\-|\+|\/|\%|<|>|\&|\||\.|\,|\:|\;|\?|\!|\$(?!\w)|\b[\w\d\-\_]+(?=(\(|\:))|\b(\d*\.?\d+)\b|\b(0x[\da-fA-F]+)\b|\b\w+\b/,
    
    fn: function() {
        var ret = '',
            pos, found;
        
        while ((pos = this.search(this.regexp)) !== -1) {
            found = this.match(this.regexp)[0];
            
            ret += this.tear(pos);
            
            if (!isNaN(found)) {
                if (/^0x[\da-fA-F]+$/.test(found)) {
                    ret += this.eat(found).wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        ret += this.eat(found).wrap(['numeric', 'int']);
                    } else {
                        ret += this.eat(found).wrap(['numeric', 'float']);
                    }
                }
            } else if (/^([\w\d\-\_]+|\$)$/i.test(found)) {
                if (found == 'true' || found == 'false') {
                    ret += this.eat(found).wrap(['boolean', found]);
                } else if (found == 'var') {
                    ret += this.eat(found).wrap(['variable']);
                } else if (found == 'null' || found == 'undefined') {
                    ret += this.eat(found).wrap(['empty-value', found]);
                } else if (this.controls.indexOf(found) !== -1) {
                    ret += this.eat(found).wrap(['control', found]);  
                } else if (this.specials.indexOf(found) !== -1) {
                    ret += this.eat(found).wrap(['specials', found]);
                } else if (this.keywords.indexOf(found) !== -1) {
                    ret += this.eat(found).wrap(['keyword', found]);
                } else if (/^\s*\(/.test(this.substr(found.length))) {
                    ret += this.eat(found).wrap('fname');
                } else if (/^\s*\:/.test(this.substr(found.length))) {
                    ret += this.eat(found).wrap('property');
                } else {
                    ret += this.eat(found).wrap('word');
                } 
            } else if (/^[^\w\d\s]+$/.test(found)) {
                if (this.punctuations.hasOwnProperty(found)) {
                    ret += this.eat(found).wrap(['punctuation', this.punctuations[found]]);
                } else if (this.operators.hasOwnProperty(found)) {
                    ret += this.eat(found).wrap(['operator', this.operators[found]]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    ret += this.eat(found).wrap(['bracket', this.brackets[found]+'bracket']);
                } else if (this.chars.hasOwnProperty(found)) {
                    ret += this.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                }
            } else if (found == "\\") {
                ret += this.eat(found+this.substring(0, 2)).wrap('escaped');
            } else if (found[0] == '/') {
                this.eat(found);
                this.eaten = this.eaten.replace(/(\\.)/g, '</span><span class="cp-escaped">$1</span><span class="cp-regexp">');
                ret += this.wrap('regexp');
            } else {
                ret += this.eat(found).wrap(['other']);
            }
        }
        
        return ret + this;
    }
});