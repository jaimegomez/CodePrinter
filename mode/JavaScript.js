/*  CodePrinter
*   JavaScript Mode
*   
*   version     0.1.4
*/

CodePrinter.JavaScript = {
    name: "JavaScript",
    
    fn: function(text) {
        var parent = this;
        
        String.prototype.nextN = function() {
            var pos = this.indexOf("\n");
            return pos !== -1 ? pos : this.length;  
        };
        
        String.prototype.wrap = function(suffix, tag) {
            if(!tag) tag = 'span';
            var result = '', tmp = this.split(/\n/g);
            suffix = (suffix instanceof Array) ? suffix : [suffix];
            
            for (var i = 0; i < suffix.length; i++) {
                suffix[i] = 'cp-'+suffix[i];
            }
            
            if(tmp.length > 1) suffix += " multiliner";
            
            for(str in tmp) {
                result += '<'+tag+' class="'+suffix.join(' ')+'">'+ tmp[str] +'</'+tag+'>';
                if(str != tmp.length-1) result += "\n";
            }
            
            return result;
        };
        
        function strtrim(from, to) {
            var indexFrom = text.indexOf(from), indexTo = 0, tmp;
            
            if (to === "\n") {
                indexTo = text.indexOf(to) - 1;
            } else if (from === to) {
                indexTo = text.indexOf(to, 1);
                if (indexTo === -1) indexTo = text.length;
            } else {
                if(!to) to = from;
                indexTo = text.indexOf(to);
                if (indexTo === -1) indexTo = indexFrom;
            }
            
            tmp = [ text.substring(indexFrom, indexTo + to.length), text.substr(indexTo + to.length) ];
            
            text = tmp[1];
            return tmp[0];
        };
        
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
        
        while(text.search(search) !== -1) {
            var pos = text.search(search);
            var found = text.match(search)[0];
            
            ret += text.substring(0, pos);
            text = text.substr(pos);
            
            if (!isNaN(found)) {
                if(/^0x[\da-fA-F]+$/.test(found)) {
                    ret += strtrim(found).wrap(['numeric', 'hex']);
                } else {
                    ret += strtrim(found).wrap(['numeric']);
                }
            } else if (/^([\w\d\-\_]+|\$)$/i.test(found)) {
                if (found == 'true' || found == 'false') {
                    ret += strtrim(found).wrap(['boolean', found]);
                } else if (found == 'null' || found == 'undefined') {
                    ret += strtrim(found).wrap(['empty-value', found]);
                } else if(keywords.indexOf(found) !== -1) {
                    ret += strtrim(found).wrap(['keyword', found]);
                } else if(specials.indexOf(found) !== -1) {
                    ret += strtrim(found).wrap(['specials', found]);
                } else if(/^\s*\(/.test(text.substr(found.length))) {
                    ret += strtrim(found).wrap('fname');
                } else if(/^\s*\:/.test(text.substr(found.length))) {
                    ret += strtrim(found).wrap('property');
                } else {
                    ret += strtrim(found);
                } 
            } else if (operators.indexOf(found) !== -1) {
                ret += strtrim(found).wrap(['operator']);
            } else if (found == "\\") {
                ret += strtrim(found+text.substring(0, 2)).wrap('escaped');
            } else if(/^(\=|\()\s*\/$/.test(found)) {
                ret += this.fn(found.substring(0, found.length-1));
                text = text.substr(found.length-1);
                found = "/";
                var pattern = /([^\\]\/[gimy]{0,4})/,
                    pos2 = text.substr(1).search(pattern);
                if(pos2 !== -1) {
                    var found2 = text.substr(1).match(pattern)[0];
                    ret += text.substring(0, pos2 + found2.length + found.length).replace(/(\\.)/g, '<span class="cp-escaped">$1</span>').wrap('regex');
                    text = text.substr(pos2 + found2.length + found.length);
                } else {
                    ret += text.replace(/(\\.)/g, '<span class="cp-escaped">$1</span>').wrap('regex');
                    text = '';
                }
            } else if(chars.hasOwnProperty(found)) {
                ret += strtrim(found, chars[found].end).wrap(chars[found].cls);
            } else if(brackets.hasOwnProperty(found)) {
                ret += strtrim(found).wrap(['bracket', brackets[found]+'bracket']);
            } else {
                ret += text.substring(0, found.length);
                text = text.substr(found.length);
            }
        }
        
        return ret + text;
    }
};