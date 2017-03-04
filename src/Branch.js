import { last } from 'helpers/index';
import { BRANCH_MAX_SIZE, BRANCH_OPTIMAL_SIZE } from 'consts';

const { splice, push, pop, shift, unshift } = Array.prototype;

class Branch {
  constructor(leaf, children) {
    this.isLeaf = leaf == null || leaf;
    this.children = children;
    this.size = this.height = 0;
    this.parent = null;

    for (var i = 0; i < children.length; i++) {
      var ch = children[i];
      this.height += ch.height;
      this.size += ch.size;
      ch.parent = this;
    }
    if (this.isLeaf) {
      this.size = children.length;
    }
  }

  indexOf(node, offset) {
    var children = this.children;
    for (var i = offset || 0, l = children.length; i < l; i++) {
      if (children[i] === node) {
        return i;
      }
    }
    return -1;
  }

  get(line) {
    if (this.isLeaf) return this.children[line] || null;
    var children = this.children, child, i = -1;
    while (++i < children.length && (child = children[i])) {
      if (child.size > line) return child.get(line);
      line -= child.size;
    }
    return null;
  }

  insert(at, lines) {
    const { children } = this;
    this.size += lines.length;
    this.height += lines.reduce((height, line) => height + line.height, 0);

    if (this.isLeaf) {
      for (let i = 0; i < lines.length; i++) {
        lines[i].parent = this;
      }
      this.children = children.slice(0, at).concat(lines, children.slice(at));
      return;
    }
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const size = child.size;

      if (at <= size) {
        child.insert(at, lines);
        if (child.isLeaf && child.size > BRANCH_MAX_SIZE) {
          const space = child.size % BRANCH_OPTIMAL_SIZE + BRANCH_OPTIMAL_SIZE;
          for (let p = space; p < child.size;) {
            const leaf = new Branch(true, child.children.slice(p, p += BRANCH_OPTIMAL_SIZE));
            leaf.parent = this;
            child.height -= leaf.height;
            children.splice(++i, 0, leaf);
          }
          child.children = child.children.slice(0, space);
          child.size = space;
          this.split();
        }
        break;
      }
      at -= size;
    }
  }

  remove(at, n) {
    var children = this.children;
    this.size -= n;
    if (this.isLeaf) {
      var spliced = splice.call(children, at, n);
      for (var i = 0; i < spliced.length; i++) {
        var child = spliced[i];
        this.height -= child.height;
        child.parent = null;
      }
      return spliced;
    }
    var r = [];
    for (var i = 0; i < children.length; i++) {
      var ch = children[i], s = ch.size;
      if (at < s) {
        var min = Math.min(n, s - at), oh = ch.height;
        push.apply(r, ch.remove(at, min));
        this.height -= oh - ch.height;
        if (s === min) {
          children.splice(i--, 1);
          ch.parent = null;
        }
        if ((n -= min) === 0) break;
        at = 0;
      } else {
        at -= s;
      }
    }
    if (this.size - n < BRANCH_OPTIMAL_SIZE && (children.length > 1 || !children[0] || !children[0].isLeaf)) {
      var leaf = new Branch(true, this.collapse([]));
      this.children = [leaf];
      leaf.parent = this;
    }
    return r;
  }

  collapse(children) {
    if (this.isLeaf) {
      children.push.apply(children, this.children);
    } else {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].collapse(children);
      }
    }
    return children;
  }

  split() {
    if (this.children.length <= 10) return;
    var branch = this;
    do {
      var spliced = branch.children.splice(branch.children.length - 5, 5);
      var sibling = new Branch(false, spliced);
      if (branch.parent) {
        branch.size -= sibling.size;
        branch.height -= sibling.height;
        var index = branch.parent.children.indexOf(branch);
        branch.parent.children.splice(index + 1, 0, sibling);
      } else {
        var clone = new Branch(false, branch.children);
        clone.parent = branch;
        branch.children = [clone, sibling];
        branch = clone;
      }
      sibling.parent = branch.parent;
    } while (branch.children.length > 10);
    branch.parent.split();
  }

  getLineWithOffset(offset) {
    var children = this.children, child, i = -1;
    while (++i < children.length && (child = children[i])) {
      if (child.height > offset) return this.isLeaf ? child : child.getLineWithOffset(offset);
      offset -= child.height;
    }
    return child.get(child.size - 1);
  }

  next() {
    var i, siblings = this.parent && this.parent.children;
    if (siblings && (i = siblings.indexOf(this)) >= 0) {
      if (i + 1 < siblings.length) return siblings[i+1];
      var next = this.parent.next();
      while (next && !next.isLeaf) next = next.children[0];
      if (next) return next;
    }
    return null;
  }

  prev() {
    var i, siblings = this.parent && this.parent.children;
    if (siblings && (i = siblings.indexOf(this)) >= 0) {
      if (i > 0) return siblings[i-1];
      var prev = this.parent.prev();
      while (prev && !prev.isLeaf) prev = last(prev.children);
      if (prev) return prev;
    }
    return null;
  }

  forEach(f, offset = 0) {
    const children = this.children;
    let tmp = offset;

    if (this.isLeaf) {
      for (let i = 0; i < children.length; i++) f(children[i], tmp + i);
    } else {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        child.forEach(f, tmp);
        tmp = tmp + child.size;
      }
    }
    return this;
  }

  forEachRight(func, tmp) {
    const children = this.children;
    let index = tmp == null ? this.size : tmp;

    if (this.isLeaf) {
      for (let i = 1, l = children.length; i <= l; i++) {
        func(children[l - i], index - i);
      }
    } else {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        child.forEachRight(func, index);
        index -= child.size;
      }
    }
    return this;
  }

  reduce(reducer, initial) {
    return reduceBranch(this, reducer, initial, 'forEach');
  }

  reduceRight(reducer, initial) {
    return reduceBranch(this, reducer, initial, 'forEachRight');
  }
}

function reduceBranch(branch, reducer, initial, methodName) {
  const method = branch[methodName];
  let acc = initial;
  method.call(branch, (line, index) => {
    acc = reducer(acc, line, index);
  });
  return acc;
}

export default Branch;
