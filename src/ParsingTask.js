import { pos } from 'statics';
import { isArray } from 'helpers/index';

class ParsingTask {
  constructor(stream, state, options) {
    this.options = options || {};
    this.state = state ? copyState(this.initialMode, state) : this.initialMode.initialState();
    this.stream = stream;
    this.tokens = [];
    this.indent = null;
    this.lock = false;
  }

  get mode() {
    return this.state.mode || this.options.mode;
  }

  get initialMode() {
    return this.options.mode;
  }

  get iterator() {
    const { iterators } = this.state;
    return iterators && iterators.iterator;
  }

  get range() {
    const { options, stream } = this;
    const lineIndex = options.lineIndex;
    return {
      from: pos(lineIndex, stream.start),
      to: pos(lineIndex, stream.pos),
    };
  }

  passthrough(mode, beforeIteration) {
    if (!mode || typeof beforeIteration !== 'function') {
      throw new Error('Received incompatible arguments!');
    }

    const state = this.state;
    const oldMode = state.mode;
    const oldContext = state.context;
    const iterator = (stream, state) => {
      if (beforeIteration(stream, state) !== false) {
        return mode.iterator(stream, state);
      }
      state.mode = oldMode;
      state.context = oldContext;
      this.pop();
    };

    if (this.mode.initialState !== mode.initialState) {
      const initial = mode.initialState();
      for (const key in initial) {
        if (state[key] == null) {
          state[key] = initial[key];
        }
      }
      if (initial.context && oldContext) {
        state.context = initial.context;
        state.context.indent = oldContext.indent;
        state.context.prev = oldContext;
      }
    }
    state.mode = mode;
    this.push(iterator);
  }

  push(...iterators) {
    const state = this.state;
    const { iterator, next } = state.iterators || {};
    const list = makeIteratorsList(iterators, next);
    state.iterators = { iterator, next: list };
  }

  use(iterator, ...iterators) {
    this.push(...iterators);
    this.state.iterators.iterator = iterator;
    return iterator.call(this, this.stream, this.state);
  }

  fallback(iterator) {
    return iterator.call(this, this.stream, this.state);
  }

  yield(token) {
    this.lock = true;
    return token;
  }

  next(token, ...iterators) {
    this.push(...iterators);
    return token;
  }

  hasIterator(iterator) {
    let tmp = this.state.iterators;
    while (tmp) {
      if (tmp.iterator === iterator) return true;
      tmp = tmp.next;
    }
    return false;
  }

  hasNext() {
    const { iterators } = this.state;
    return iterators && iterators.next && iterators.next.iterator;
  }

  pushContext(type, extend = {}) {
    const prev = this.state.context;
    const indent = this.state.indent + 1;
    const start = this.range;
    this.state.context = { type, prev, indent, start, ...extend };
  }

  popContext() {
    const state = this.state;
    const context = state.context;

    if (context && context.prev) {
      context.end = this.range;
      state.indent = context.indent - 1;
      state.context = context.prev;
    }
  }

  lastTokenIncludes(...args) {
    const { lastToken } = this.stream;
    return lastToken && args.some(arg => {
      if (isArray(arg)) {
        return arg.every(token => lastToken.includes(token));
      }
      return lastToken.includes(arg);
    });
  }

  undoLastToken(token) {
    if (!token || this.lastToken === token) {
      return this.tokens.pop();
    }
  }

  getVariableType(varName) {
    let ctx = this.state.context;
    while (ctx) {
      if (ctx.vars && ctx.vars[varName]) {
        return ctx.vars[varName];
      }
      // if (ctx.params && ctx.params[varName]) return tokens.variable;
      ctx = ctx.prev;
    }
  }

  saveVariable(varName, varType, contextType) {
    let ctx = this.state.context;
    while (ctx && ctx.prev && (ctx.type > contextType || !(ctx.type & contextType))) {
      ctx = ctx.prev;
    }
    if (ctx) {
      if (!ctx.vars) ctx.vars = {};
      ctx.vars[varName] = varType;
    }
    return varType;
  }
}

function makeIteratorsList(items, tail) {
  let list = tail;
  for (let i = items.length - 1; i >= 0; i--) {
    const iterator = items[i];
    list = { iterator, next: list };
  }
  return list;
}

function copyState(mode, state) {
  if (mode.copyState) {
    return mode.copyState(state);
  }
  const st = Object.create(null);
  const keys = state ? Object.keys(state) : [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (state[key] != null) {
      st[key] = state[key];
    }
  }
  return st;
}

export default ParsingTask;
