import Match from 'Match';

class Matcher {
  constructor(match) {
    this.rules = {};
    if (typeof match === 'function') {
      this.match = match;
    }
  }

  addRule(rule) {
    if (rule && rule.key) {
      this.rules[rule.key] = rule;
    }
  }

  findOffset(before, after, key) {
    for (let i = 0, l = key.length; i <= l; i++) {
      if (before.lastIndexOf(key.substring(0, i)) === before.length - i && after.indexOf(key.substr(i)) === 0) {
        return -i;
      }
    }
  }

  match(text, column) {
    const rules = this.rules;
    const before = text.substring(0, column);
    const after = text.substr(column);

    for (const key in rules) {
      var offset = this.findOffset(before, after, key);
      if (typeof offset === 'number') {
        return new Match(key, column + offset, rules[key]);
      }
    }
  }

  search(doc, line, match) {
    if (match.keySymbol && !doc.hasSymbolAt(match.keySymbol, p(line, match.colStart + 1))) {
      return false;
    }
    var counter = 1, i = 0, pos, fn, fix;

    switch (match.direction) {
      case 'left':
        pos = p(line, match.colStart);
        fn = doc.searchLeft;
        fix = 0;
        break;
      case 'right':
        pos = p(line, match.colEnd);
        fn = doc.searchRight;
        fix = 1;
        break;
      default:
        return false;
    }
    do {
      var a = fn.call(doc, pos, match.search, match.searchSymbol)
      , b = fn.call(doc, pos, match.key, match.keySymbol);

      if (a) {
        var comp = b && cmp(a, b);
        if (comp && (fix ? comp > 0 : comp < 0)) {
          ++counter;
          a = b;
        } else {
          --counter;
        }
        pos = p(a.line, a.column + fix);
      } else {
        counter = 0;
      }
    } while (counter !== 0 && ++i < 100);

    if (a && i < 100) {
      return [
        r(p(line, match.colStart), p(line, match.colEnd)),
        r(p(pos.line, pos.column - fix), p(pos.line, pos.column - fix + match.search.length))
      ];
    }
  }
}

export default Matcher;
