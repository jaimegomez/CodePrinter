import { copy } from 'helpers/index';
import historyActions from 'historyActions';
import { checkSupport, copyState, historyMove, historyPush } from 'helpers/history';

class History {
  constructor(doc) {
    this.doc = doc;
    this.lock = false;
    this.done = [];
    this.undone = [];
    this.staged = undefined;
  }

  commit() {
    if (this.staged && this.staged.length) {
      if (this.undone.length) this.undone.length = 0;
      historyPush(this, this.done, this.staged);
    }
    this.staged = undefined;
  }

  getChanges(stringify) {
    const obj = { done: this.done, undone: this.undone, staged: this.staged };
    return stringify ? JSON.stringify(obj) : copy(obj);
  }

  perform(change) {
    if (change) {
      this.lock = true;
      this.doc.makeChange(change);
      this.lock = false;
    }
    return !!change;
  }

  push(state) {
    if (!this.lock && state && historyActions[state.type]) {
      const copiedState = copyState(state);
      if (this.staged) return this.staged.push(copiedState);
      if (this.undone.length) this.undone.length = 0;
      return this.done.push(copiedState);
    }
  }

  redo() {
    return this.perform(historyMove(this, this.undone, this.done));
  }

  setChanges(data) {
    if (data && data.done && data.undone) {
      try {
        checkSupport(data.done);
        checkSupport(data.undone);
        data.staged && checkSupport(data.staged);
      } catch (e) {
        throw e;
      }
      this.done = data.done;
      this.undone = data.undone;
      this.staged = data.staged;
    }
  }

  stage() {
    this.staged = [];
  }

  undo() {
    return this.perform(historyMove(this, this.done, this.undone));
  }
}

export default History;
