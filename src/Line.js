import { touch } from 'helpers/view';
import { HIDDEN_CLASSNAME, LINE_MARKED_CLASSNAME } from 'consts';
import { arrayAdd, arrayRemove, clearLine, last } from 'helpers/index';

class Line {
  constructor(text, height) {
    this.text = text;
    this.height = height;
    this.parent = this.view = null;
    this.tokens = this.state = null;
    return this;
  }

  addClass(className) {
    if (!this.classes) this.classes = [];
    arrayAdd(this.classes, className);
    touch(this);
  }

  getIndex() {
    if (!this.parent) return -1;
    var child = this, parent = this.parent, total = 0, i;
    do {
      i = parent.children.indexOf(child);
      if (parent.isLeaf) total += i;
      while (--i >= 0) total += parent.children[i].size | 0;
      child = parent;
      parent = parent.parent;
    } while (parent);
    return total;
  }

  getOffset() {
    if (!this.parent) return 0;
    var child = this, parent = this.parent, total = 0, i;
    do {
      i = parent.children.indexOf(child);
      while (--i >= 0) total += parent.children[i].height | 0;
      child = parent;
      parent = parent.parent;
    } while (parent);
    return total;
  }

  hasClass(className) {
    return this.classes && this.classes.indexOf(className) >= 0;
  }

  next(skipMerged) {
    if (!this.parent) return;
    if (skipMerged && this.merged) return last(this.merged).next();
    var siblings = this.parent.children, i = siblings.indexOf(this);
    if (i + 1 < siblings.length) return siblings[i+1];
    else {
      var next = this.parent.next();
      return next && next.children[0];
    }
  }

  prev(skipMerged) {
    if (!this.parent) return;
    var siblings = this.parent.children, i = siblings.indexOf(this), dl;
    if (i > 0) dl = siblings[i-1];
    else {
      var prev = this.parent.prev();
      dl = prev && last(prev.children);
    }
    return dl && skipMerged && dl.mergedWith || dl;
  }

  removeClass(className) {
    if (this.classes) {
      arrayRemove(this.classes, className);
      if (this.classes.length === 0) this.classes = undefined;
      touch(this);
    }
  }

  setText(str) {
    if (this.text !== str) {
      clearLine(this);
      this.text = str;
    }
  }

  toggleClass(className) {
    const has = this.hasClass(className);
    has ? this.removeClass(className) : this.addClass(className);
    return !has;
  }

  toggleHidden() {
    return this.toggleClass(HIDDEN_CLASSNAME);
  }

  toggleMarked() {
    return this.toggleClass(LINE_MARKED_CLASSNAME);
  }

  toString() {
    return `Line(${this.text})`;
  }

  updateView() {
    if (this.view) {
      this.view.update(this.text, this.tokens);
    }
  }
}

export default Line;
