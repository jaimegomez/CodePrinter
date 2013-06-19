CodePrinter.JavaScript = {
    name: "JavaScript",
    prefix: "js-",
    
    fn: function(text) {
        var parent = this;
        
        String.prototype.nextN = function() {
            var pos = this.indexOf("\n");
            return pos !== -1 ? pos : this.length;  
        };
        
        String.prototype.wrap = function(suffix, tag) {
            if(!tag) tag = 'span';
            var result = '', tmp = this.split(/\n/g);
            
            if(tmp.length > 1) suffix += " multiliner";
            
            for(str in tmp) {
                result += '<'+tag+' class="'+ parent.prefix + suffix +'">'+ tmp[str] +'</'+tag+'>';
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
        
        var keywords = [ 'var','function','this','if','else','for','do','while','switch','case','return','new','in','typeof','break','continue','true','false' ];
        var specials = [ "window","document","console","Math","prototype","$","jQuery" ];
        var search = /(\/\*|\/\/|\\|(\=|\()\s*\/|"|'|\{|\}|\(|\)|\[|\]|\&lt;|\&gt;|\$(?!\w)|\b[\w\d\-\_]+(?=(\(|\:))|\b(\d*\.?\d+)\b|\b(0x[\da-fA-F]+)\b|\b\w+\b)/;
        var chars = { 
            "//": { end: "\n", class: "comment" }, 
            "/*": { end: "*/", class: "comment" },
            "'": { end: "'", class: "string" },
            '"': { end: '"', class: "string" }
        };
        var brackets = {
            "{": "curlybracket",
            "}": "curlybracket",
            "[": "squarebracket",
            "]": "squarebracket",
            "(": "roundbracket",
            ")": "roundbracket",
            "&lt;": "anglebracket",
            "&gt;": "anglebracket"
        };
        var ret = '';
        
        while(text.search(search) !== -1) {
            var pos = text.search(search);
            var found = text.match(search)[0];
            
            ret += text.substring(0, pos);
            text = text.substr(pos);
            
            if (!isNaN(found)) {
                if(/^0x[\da-fA-F]+$/.test(found)) {
                    ret += strtrim(found).wrap('hex');
                    
                } else {
                    ret += strtrim(found).wrap('number');
                    
                }
            } else if (/^([\w\d\-\_]+|\$)$/i.test(found)) {
                if(keywords.indexOf(found) !== -1) {
                    ret += strtrim(found).wrap('keyword');
                } else if(specials.indexOf(found) !== -1) {
                    ret += strtrim(found).wrap('specials');
                } else if(/^\s*\(/.test(text.substr(found.length))) {
                    ret += strtrim(found).wrap('fname');
                } else if(/^\s*\:/.test(text.substr(found.length))) {
                    ret += strtrim(found).wrap('property');
                } else {
                    ret += strtrim(found);
                } 
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
                    ret += text.substring(0, pos2 + found2.length + found.length).replace(/(\\.)/g, '<span class="js-escaped">$1</span>').wrap('regex');
                    text = text.substr(pos2 + found2.length + found.length);
                } else {
                    ret += text.replace(/(\\.)/g, '<span class="js-escaped">$1</span>').wrap('regex');
                    text = '';
                }
            } else if(chars.hasOwnProperty(found)) {
                ret += strtrim(found, chars[found].end).wrap(chars[found].class);
            } else if(brackets.hasOwnProperty(found)) {
                ret += strtrim(found).wrap(brackets[found]);
            } else {
                ret += text.substring(0, found.length);
                text = text.substr(found.length);
            }
        }
        
        return ret + text;
    }
};