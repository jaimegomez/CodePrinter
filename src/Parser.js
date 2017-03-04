import Stream from 'Stream';
import { EOL } from 'consts';
import ParsingTask from 'ParsingTask';
import { createNode, isArray } from 'helpers/index';

function executeTask(task, { end }) {
  const { stream, state, tokens } = task;
  const l = end != null ? end : stream.length;
  task.mode.onEntry.call(task, stream, state);
  while (stream.pos < l) iteration(task, stream, state, tokens);
  task.mode.onExit.call(task, stream, state);
  return task;
}

function getStateIterator(state) {
  const iterators = state && state.iterators;
  return iterators && iterators.iterator;
}

function popStateIterators(state) {
  const iterators = state && state.iterators;
  if (iterators) {
    state.iterators = iterators.next;
  }
}

function resolveIteratorResult(task, result) {
  if (result) {
    const type = typeof result;
    if (type === 'string') {
      return [result];
    } else if (type === 'function') {
      task.push(result);
    } else if (isArray(result)) {
      return result;
    } else {
      console.trace('Unrecognized output:', result);
      throw new Error(`Unrecognized output: ${result}`);
    }
  }
  return result;
}

const iterationHandlers = [
  handleBeforeIteration,
  handleIteration,
  handleAfterIteration,
];

function handleBeforeIteration(task, mode, stream, state) {
  if (mode.skipSpaces && stream.take(/^\s*/)) {
    return task.yield(null);
  }
  if (mode.beforeIterator) {
    return mode.beforeIterator.call(task, stream, state);
  }
}

function handleAfterIteration(task, mode, stream, state) {
  if (mode.afterIterator) {
    return mode.afterIterator.call(task, stream, state);
  }
}

function handleIteration(task, mode, stream, state) {
  const iterator = task.iterator || mode.iterator;
  const result = iterator.call(task, stream, state);
  if (!task.lock) {
    popStateIterators(state);
  }
  return result;
}

function callIterationHandler(task, handler) {
  const result = handler(task, task.mode, task.stream, task.state);
  return resolveIteratorResult(task, result);
}

function callTokenEvent(token, task) {
  if (token && task.options.onIteration) {
    task.options.onIteration(token, task);
  }
}

function getNextToken(task) {
  task.lock = false;
  for (const handler of iterationHandlers) {
    const result = callIterationHandler(task, handler);
    if (result !== undefined) {
      return result;
    }
  }
  return null;
}

function iteration(task, stream, state, tokens) {
  stream.proceed();
  return task.indent ? readIteration(task, stream, state, tokens) : readIndentation(task, task.options);
}

function readIndentation(task, { tabWidth, tabString }) {
  const { stream, tokens } = task;
  let char;
  let spaces = 0;
  let level = 0;

  function eatTab() {
    spaces = 0;
    level++;
    stream.transform(tabString);
    tokenPush(tokens, stream.start, stream.pos, ['tab']);
    stream.proceed();
  }

  while (char = stream.eatChar()) {
    if (char === ' ') {
      if (++spaces === tabWidth) {
        eatTab();
      }
    } else if (char === '\t') {
      eatTab();
    } else {
      stream.undo();
      break;
    }
  }
  task.indent = { level, spaces };
}

function readIteration(task, stream, state, tokens) {
  for (let i = 0; i < 7; i++) {
    const token = getNextToken(task, stream, state);
    if (stream.pos > stream.start) {
      if (token) {
        stream.lastToken = token;
        stream.lastValue = stream.from(stream.start);
        tokenPush(tokens, stream.start, stream.pos, token);
      }
      return token;
    }
  }
  console.error('Task failed:', task);
  throw new Error('Too many inefficient iterations!');
}

function tokenPush(tokens, from, to, token) {
  tokens[tokens.length] = { from, to, token };
}

const DEFAULT_OPTIONS = { tabWidth: 2, tabString: '  ' };
function parse(text, previousState, options = DEFAULT_OPTIONS) {
  const stream = new Stream(text);
  const task = new ParsingTask(stream, previousState, options);
  return executeTask(task, options);
}

function stateChanged(stateA, stateB) {
  if (stateA && stateB) {
    if (stateA.context !== stateB.context || stateA.mode !== stateB.mode) {
      return true;
    }
    const iteratorA = getStateIterator(stateA);
    const iteratorB = getStateIterator(stateB);
    return !iteratorA !== !iteratorB || (iteratorA && iteratorA.toString() !== iteratorB.toString());
  }
  return false;
}

export default {
  getStateIterator,
  parse,
  stateChanged,
};
