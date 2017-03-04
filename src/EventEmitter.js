
class EventEmitter {
  static extend(obj) {
    obj._events = new Map();
    Object.getOwnPropertyNames(this.prototype).forEach(name => {
      Object.defineProperty(obj, name, {
        value: this.prototype[name]
      });
    });
  }

  constructor() {
    this._events = new Map();
  }

  emit(eventName, ...args) {
    const listeners = this.getListeners(eventName);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i].apply(this, args);
    }
    if (this._owner) {
      this._owner.emit.apply(this._owner, [eventName, this].concat(args));
    }
    return this;
  }

  getListeners(eventName) {
    return this._events.get(eventName) || [];
  }

  on(eventName, listener) {
    const listeners = this.getListeners(eventName);
    if (typeof listener === 'function') {
      listeners.push(listener);
      if (listeners.length === 1) {
        this._events.set(eventName, listeners);
      }
    }
    return this;
  }

  once(eventName, listener) {
    const callback = (...args) => {
      this.off(eventName, callback);
      listener.apply(this, args);
    };
    return this.on(eventName, callback);
  }

  off(eventName, listener) {
    if (typeof eventName === 'string') {
      const listeners = this.getListeners(eventName);
      if (listener) {
        const i = listeners.indexOf(listener);
        if (i >= 0) {
          listeners.splice(i, 1);
        }
      }
      if (!listener || !listeners.length) {
        this._events.delete(eventName);
      }
    } else {
      this._events.clear();
    }
    return this;
  }

  propagateTo(owner) {
    this._owner = owner;
    return this;
  }
}

EventEmitter.extend(EventEmitter);

export default EventEmitter;
