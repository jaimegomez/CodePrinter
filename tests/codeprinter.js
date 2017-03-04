import { lines, reset } from 'helpers/tests';

describe('CodePrinter', () => {
  beforeAll(reset);

  it('should be initialized', () => {
    expect(cp.doc.getValue()).toBe(lines.join('\n'));
  });

  it('should have custom options', () => {
    expect(cp.hasOwnOption('height')).toBe(true);
    expect(cp.hasOwnOption('shortcuts')).toBe(true);
    expect(cp.hasOwnOption('autoFocus')).toBe(false);

    expect(cp.getOption('height')).toBe(1000);
    expect(cp.getOption('shortcuts')).toBe(false);
  });

  it('can change options', () => {
    expect(cp.getOption('autoIndent')).toBe(true);
    cp.setOption('autoIndent', false);
    expect(cp.getOption('autoIndent')).toBe(false);
  });

  it('has correct tab string', () => {
    expect(cp.getTabString()).toBe('  ');
  });

  it('should get focus', () => {
    cp.focus();
    expect(cp.dom.input).toBe(document.activeElement);
  });
});
