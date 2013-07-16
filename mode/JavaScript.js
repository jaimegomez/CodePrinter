/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', {
    
    fn: function() {
        var keywords = ['var','function','this','if','else','return','for','while','new','do','continue','break','instanceof','typeof','switch','case','try','catch','debugger','default','delete','finally','in','throw','void','with'],
            specials = ['window','document','console','Object','Array','Math','$','jQuery','Selector'],
            operators = ['=','-','+','/','%','&lt;','&gt;','&','|'],
            search = /(\/\*|\/\/|\\|(\=|\()\s*\/|"|'|\{|\}|\(|\)|\[|\]|\=|\-|\+|\/|\%|\&lt;|\&gt;|\&|\||\$(?!\w)|\b[\w\d\-\_]+(?=(\(|\:))|\b(\d*\.?\d+)\b|\b(0x[\da-fA-F]+)\b|\b\w+\b)/,
            chars = { 
                "//": { end: "\n", cls: ['comment', 'line-comment'] }, 
                "/*": { end: "*/", cls: ['comment', 'multiline-comment'] },
                "'": { end: "'", cls: ['string', 'single-quote'] },
                '"': { end: '"', cls: ['string', 'double-quote'] }
            },
            brackets = {
                "{": "curly",
                "}": "curly",
                "[": "square",
                "]": "square",
                "(": "round",
                ")": "round"
            },
            ret = '';
        
        while (this.search(search) !== -1) {
            var pos = this.search(search),
                found = this.match(search)[0];
            
            ret += this.substring(0, pos);
            console.log(this.substring(0, pos));
            this.stream = this.substr(pos);
            
            if (!isNaN(found)) {
                if(/^0x[\da-fA-F]+$/.test(found)) {
                    ret += this.eat(found).wrap(['numeric', 'hex']);
                } else {
                    ret += this.eat(found).wrap(['numeric']);
                }
            } else if (/^([\w\d\-\_]+|\$)$/i.test(found)) {
                if (found == 'true' || found == 'false') {
                    ret += this.eat(found).wrap(['boolean', found]);
                } else if (found == 'null' || found == 'undefined') {
                    ret += this.eat(found).wrap(['empty-value', found]);
                } else if(keywords.indexOf(found) !== -1) {
                    ret += this.eat(found).wrap(['keyword', found]);
                } else if(specials.indexOf(found) !== -1) {
                    ret += this.eat(found).wrap(['specials', found]);
                } else if(/^\s*\(/.test(this.substr(found.length))) {
                    ret += this.eat(found).wrap('fname');
                } else if(/^\s*\:/.test(this.substr(found.length))) {
                    ret += this.eat(found).wrap('property');
                } else {
                    ret += this.eat(found).wrap('word');
                } 
            } else if (operators.indexOf(found) !== -1) {
                ret += this.eat(found).wrap(['operator']);
            } else if (found == "\\") {
                ret += this.eat(found+this.substring(0, 2)).wrap('escaped');
            } /*else if(/^(\=|\()\s*\/$/.test(found)) {
                ret += this.fn(found.substring(0, found.length-1));
                this.stream = this.substr(found.length-1);
                found = "/";
                var pattern = /([^\\]\/[gimy]{0,4})/,
                    pos2 = this.substr(1).search(pattern);
                if(pos2 !== -1) {
                    var found2 = this.substr(1).match(pattern)[0];
                    ret += this.substring(0, pos2 + found2.length + found.length).replace(/(\\.)/g, '<span class="cp-escaped">$1</span>').wrap('regex');
                    this.stream = this.substr(pos2 + found2.length + found.length);
                } else {
                    ret += this.replace(/(\\.)/g, '<span class="cp-escaped">$1</span>').wrap('regex');
                    //text = '';
                }
            }*/ else if(chars.hasOwnProperty(found)) {
                ret += this.eat(found, chars[found].end).wrap(chars[found].cls);
            } else if(brackets.hasOwnProperty(found)) {
                ret += this.eat(found).wrap(['bracket', brackets[found]+'bracket']);
            } else {
                ret += this.substring(0, found.length);
                this.stream = this.substr(found.length);
            }
        }
        
        return ret + this.stream;
    }
});