import Parser from 'Parser';
import commands from 'commands';
import Document from 'Document';
import tokens from 'data/tokens';
import * as statics from 'statics';
import defaults from 'data/defaults';
import EventEmitter from 'EventEmitter';
import * as optionSetters from 'optionSetters';
import { attachEvents } from 'helpers/attachEvents';
import { addLayer, createLayer, removeLayer } from 'helpers/layers';
import { copy, createNode, getFontDims, schedule, valueOf } from 'helpers/index';

import '../CodePrinter.css';

const instances = new Set();
// Set for all CodePrinter instances

const storage = new WeakMap();
// WeakMap { [codeprinter] => { options }}
// storage for private data for each CodePrinter instance

class CodePrinter extends EventEmitter {
  static getDefaults() {
    return copy(defaults);
  }

  static setDefault(optionName, value) {
    const oldValue = defaults[optionName];
    if (optionSetters[optionName]) {
      this.each(cp => {
        cp.hasOwnOption(optionName) || optionSetters[optionName].call(cp, value, oldValue);
      });
    }
    defaults[optionName] = value;
  }

  static setDefaults(extend = {}) {
    for (const optionName in extend) {
      this.setDefault(optionName, extend[optionName]);
    }
  }

  static defineOption(optionName, defaultValue, setter) {
    if (optionName in defaults) {
      throw new Error(`CodePrinter: option "${optionName}" is already registered!`);
    }
    if (typeof setter === 'function') {
      optionSetters[optionName] = setter;
    }
    defaults[optionName] = defaultValue;
  }

  static each(func) {
    if ('function' !== typeof func) {
      throw new TypeError('CodePrinter.each requires function as the first argument');
    }
    for (const cp of instances) {
      func.call(this, cp);
    }
  }

  constructor(options = {}, source = '') {
    super();
    buildDOM(this);

    storage.set(this, {
      options: {},
      layers: new Set(),
    });

    this.tabString = '  ';
    this.setOptions(options);
    // this.keypressBindings = new keypressBindings;
    // setOptions(this, options);

    this.setDocument(this.createDocument(source, this.getOption('mode')));
    attachEvents(this);
    instances.add(this);
  }

  addLayer(layer) {
    const { layers } = storage.get(this);
    return addLayer(this, layers, layer);
  }

  createDocument(source, mode) {
    return new Document(valueOf(source), mode, getFontDims(this));
  }

  createLayer(...args) {
    return createLayer(this, args);
  }

  execute(command, ...args) {
    const fn = commands[command];
    if (!fn) {
      throw new Error(`Cannot find command with name "${command}".`);
    }
    return fn.apply(this, args);
  }

  setDocument(doc = this.createDocument()) {
    if (!(doc instanceof Document)) {
      throw new TypeError(`setDocument: passed argument is not a CodePrinter Document`);
    }
    const old = this.doc;
    if (old !== doc) {
      const wasFocused = old ? old.isFocused : this.getOption('autoFocus');
      if (old) Document.detach(this, old);
      Document.attach(this, doc, wasFocused);
      this.emit('documentChanged', old, doc);
      if (this.dom.mainNode.parentNode) doc.print();
    }
    return old;
  }

  getOption(optionName) {
    const { options } = storage.get(this);
    const option = options[optionName];
    return option !== undefined ? option : defaults[optionName];
  }

  getOptions(pick) {
    if (Array.isArray(pick)) {
      const opts = {};
      for (const optionName of pick) {
        opts[optionName] = this.getOption(optionName);
      }
      return opts;
    }
    const { options } = storage.get(this);
    return { ...defaults, ...options };
  }

  setOption(optionName, value) {
    const oldValue = this.getOption(optionName);
    if (optionName && value !== oldValue) {
      const setter = optionSetters[optionName];
      const setterResult = setter && setter.call(this, value, oldValue);

      if (setterResult === oldValue && oldValue !== undefined) {
        return this;
      }
      const { options } = storage.get(this);
      options[optionName] = setterResult !== undefined ? setterResult : value;
      this.emit('optionChanged', optionName, value, oldValue);
    }
    return this;
  }

  setOptions(extend) {
    for (const optionName in extend) {
      this.setOption(optionName, extend[optionName]);
    }
    return this;
  }

  hasOwnOption(optionName) {
    const { options } = storage.get(this);
    return options[optionName] !== undefined;
  }

  initAddon(addon, options) {
    return CodePrinter.requireAddon(addon, construct => {
      return new construct(this, options);
    });
  }

  focus() {
    return this.dom.input.focus();
  }

  getTabString() {
    return this.getOption('indentByTabs') ? '\t' : ' '.repeat(this.getOption('tabWidth'));
  }

  getSnippets() {
    return Object.assign({}, this.getOption('snippets'), this.doc.parser && this.doc.parser.snippets);
  }

  // TODO: uglify
  findSnippet(snippetName, head) {
    var s = this.getOption('snippets'), b;
    if (!(b = s && s.hasOwnProperty(snippetName))) {
      s = this.doc.parser && this.doc.parser.snippets;
      b = s && s.hasOwnProperty(snippetName);
    }
    s = b && s[snippetName];
    if ('function' === typeof s) s = functionSnippet(this.doc, head, s);
    if (s) return 'string' === typeof s ? { content: s } : s;
  }

  // TODO: uglify
  registerSnippet() {
    var snippets = this.getOption('snippets');
    if (!snippets) snippets = [];
    for (var i = 0; i < arguments.length; i++) {
      var snippet = arguments[i];
      if (snippet.content && snippet.trigger) snippets.push(snippet);
    }
    this.setOption('snippets', snippets);
  }

  registerKey(keySequence, binding) {
    this.keyMap[keySequence] = binding;
    return this;
  }

  removeLayer(layer) {
    const { layers } = storage.get(this);
    return removeLayer(this, layers, layer);
  }

  unregisterKey(keySequence) {
    delete this.keyMap[keySequence];
    return this;
  }

  exec(commandName, ...args) {
    const command = commands[commandName];
    command.apply(this, args);
    return this;
  }

  call(keySequence) {
    if (keySequence) {
      const c = this.keyMap[keySequence];
      if (c) return c.call(this, keySequence);
    }
  }

  enterFullscreen() {
    if (!this.isFullscreen) {
      var main = this.dom.mainNode, b = document.body;
      this._ = document.createTextNode('');
      addClass(main, 'cp-fullscreen');
      main.style.margin = [-b.style.paddingTop, -b.style.paddingRight, -b.style.paddingBottom, -b.style.paddingLeft, ''].join('px ');
      main.style.width = "";
      main.parentNode.insertBefore(this._, main);
      document.body.appendChild(main);
      this.isFullscreen = true;
      this.doc.fill();
      this.input.focus();
      this.emit('fullscreenEntered');
    }
  }

  exitFullscreen() {
    if (this.isFullscreen && this._) {
      var tmp = this._;
      removeClass(this.dom.mainNode, 'cp-fullscreen').style.removeProperty('margin');
      tmp.parentNode.insertBefore(this.dom.mainNode, tmp);
      tmp.parentNode.removeChild(tmp);
      delete this._;
      this.isFullscreen = false;
      optionSetters.width.call(this, this.getOption('width'), undefined);
      this.doc.fill();
      this.input.focus();
      this.emit('fullscreenLeaved');
    }
  }

  getDOMNode() {
    return this.dom.mainNode;
  }

  destroy() {
    const parent = this.dom.mainNode.parentNode;
    if (parent) {
      parent.removeChild(this.dom.mainNode);
    }
    instances.delete(this);
  }

  useSource(source) {
    if (typeof source === 'string') {
      this.doc.init(source);
    } else if (source && source.parentNode) {
      source.parentNode.insertBefore(this.dom.mainNode, source);
      source.style.display = 'none';
      this.doc.init(source.value || source.textContent);
    }
    return this;
  }
}

function buildDOM(cp) {
  const dom = cp.dom = {};
  dom.mainNode = createNode(null, 'div', 'codeprinter cps-default');
  dom.body = createNode(dom.mainNode, 'div', 'cp-body');
  dom.container = createNode(dom.body, 'div', 'cp-container');
  dom.input = createNode(dom.container, 'textarea', 'cp-input');
  dom.editor = createNode(dom.container, 'div', 'cp-editor');
  dom.scroll = createNode(dom.editor, 'div', 'cp-scroll');
  dom.counter = createNode(dom.scroll, 'div', 'cp-counter');
  dom.counterChild = createNode(dom.counter, 'div', 'cp-counter-child');
  dom.wrapper = createNode(dom.scroll, 'div', 'cp-wrapper');
  dom.relative = createNode(dom.wrapper, 'div', 'cp-relative');
  dom.caretsContainer = createNode(dom.relative, 'div', 'cp-carets');
  dom.screen = createNode(dom.relative, 'div', 'cp-screen');
  dom.code = createNode(dom.screen, 'div', 'cp-code');
  dom.measure = createNode(dom.screen, 'div', 'cp-measure');
}

CodePrinter.version = '0.9.0';
CodePrinter.src = '';
CodePrinter.Parser = Parser;
CodePrinter.tokens = tokens;
Object.assign(CodePrinter, statics);

const context = typeof window === 'object' ? window : global;
context.CodePrinter = CodePrinter;

export default CodePrinter;
