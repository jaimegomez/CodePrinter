import { camelize } from 'helpers/index';

const tokens = Object.create(null);
const tokensArray = [
  'binary',
  'bold',
  'boolean',
  'bracket',
  'builtin',
  'close-tag',
  'comment',
  'constant',
  'control',
  'directive',
  'escaped',
  'external',
  'function',
  'hex',
  'invalid',
  'italic',
  'keyword',
  'namespace',
  'numeric',
  'octal',
  'open-tag',
  'operator',
  'parameter',
  'property',
  'punctuation',
  'regexp',
  'special',
  'strike',
  'string',
  'tab',
  'underline',
  'variable',
  'word',
];

for (const token of tokensArray) {
  tokens[camelize(token)] = token;
}

export default Object.freeze(tokens);
