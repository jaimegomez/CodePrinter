class Stream {
  constructor(value) {
    this.pos = 0;
    this.value = value;
    this.length = value.length;
  }

  next() {
    if (this.pos < this.value.length) {
      return this.value.charAt(this.pos++);
    }
  }

  at(offset) {
    return this.value.charAt(this.pos + (offset | 0));
  }

  peek() {
    return this.at(0);
  }

  from(pos) {
    return this.value.substring(pos, this.pos);
  }

  rest(length) {
    return this.value.substr(this.pos, length);
  }

  current() {
    return this.from(this.start);
  }

  sol() {
    return this.pos === 0;
  }

  eol() {
    return this.pos >= this.value.length;
  }

  eat(match) {
    const type = typeof match, ch = this.at(0);
    let eaten;
    if (type === 'string') eaten = ch === match;
    else eaten = ch && (type === 'function' ? match(ch) : match.test(ch));
    if (eaten) {
      ++this.pos;
      return ch;
    }
  }

  eatChar() {
    const char = this.at(0);
    if (char) ++this.pos;
    return char;
  }

  eatChain(chain) {
    const eaten = startsWith(this.value, chain, this.pos);
    if (eaten) this.pos += chain.length;
    return eaten;
  }

  eatWhile(match) {
    var pos = this.pos, type = typeof match;
    if ('function' === type) for (var v = this.value; this.pos < v.length && match(v[this.pos]); this.pos++);
    else while (this.eat(match));
    return this.from(pos);
  }

  eatWhileRgx(rgx) {
    const pos = this.pos;
    while (rgx.test(this.peek())) ++this.pos;
    return this.from(pos);
  }

  eatUntil(match, noLeftContext) {
    var pos = this.pos;
    if (match instanceof RegExp) {
      if (match.test(this.value.substr(this.pos))) {
        var lc = RegExp.leftContext.length;
        if (!noLeftContext || lc === 0) {
          this.pos += lc + RegExp.lastMatch.length;
        }
      }
    }
    return this.from(pos);
  }

  match(match, eat, caseSensitive) {
    var type = typeof match;
    if ('string' === type) {
      var cs = function(str) { return caseSensitive ? str.toLowerCase() : str; };
      var substr = this.value.substr(this.pos, match.length);
      if (cs(substr) === cs(match)) {
        if (eat) this.pos += match.length;
        return true;
      }
    } else {
      var ex = match.exec(this.value.substr(this.pos));
      if (ex && ex.index > 0) return null;
      if (ex && eat) this.pos += ex[0].length;
      return ex;
    }
  }

  proceed() {
    this.start = this.pos;
  }

  take(match) {
    const rest = this.value.substring(this.pos);
    const ex = match.exec(rest);
    if (ex) {
      this.pos = this.pos + ex[0].length;
      return ex[0];
    }
  }

  transform(to) {
    const current = this.current();
    this.value = this.value.substring(0, this.start) + to + this.value.substring(this.pos);
    this.pos = this.start + to.length;
    this.length = this.value.length;
  }

  capture(match, index) {
    if (match instanceof RegExp) {
      var m = match.exec(this.value.substr(this.pos));
      if (m) return m[index || 0];
    }
  }

  isAfter(match) {
    var str = this.value.substr(this.pos);
    return typeof match === 'string' ? str.startsWith(match) : match.test ? match.test(str) : match(str);
  }

  isBefore(match, offset) {
    var str = this.value.substring(0, this.pos + (offset || 0));
    return typeof match === 'string' ? str.startsWith(match, str.length - match.length) : match.test ? match.test(str) : match(str);
  }

  skip(ch) {
    if (ch) {
      var i = this.value.indexOf(ch, this.pos);
      if (i === -1) return false;
      this.pos = i + ch.length;
    } else this.pos = this.value.length;
    return true;
  }

  skipTo(str) {
    const i = this.value.indexOf(str, this.pos);
    if (i === -1) {
      this.pos = this.value.length;
      return false;
    }
    this.pos = i + str.length;
    return true;
  }

  undo(n) {
    const m = n == null ? 1 : n;
    this.pos = Math.max(0, this.pos - m);
  }

  markDefinition(defObject) {
    this.definition = { pos: this.offset + this.start, ...defObject };
  }
}

function startsWith(str, chain, offset) {
  for (let i = 0; i < chain.length; i++) {
    if (str.charAt(i + offset) !== chain.charAt(i)) {
      return false;
    }
  }
  return true;
}

export default Stream;
