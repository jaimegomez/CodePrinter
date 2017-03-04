import Line from 'Line';

describe('Data', () => {
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function repeat(times, f) {
    for (let i = 0; i < times; i++) f(i);
  }

  function testOrder() {
    data.forEach((line, index) => {
      expect(line.text).toBe(lines[index]);
    });
  }

  function testLinesHeight() {
    const height = data.reduce((height, line) => height + line.height, 0);
    expect(data.height).toBe(height);
  }

  function getBranchDeepLevel(branch, level) {
    if (branch.isLeaf) return level;

    let min = Infinity;
    let max = level;

    for (let i = 0; i < branch.children.length; i++) {
      const lv = getBranchDeepLevel(branch.children[i], level + 1);
      min = Math.min(min, lv);
      max = Math.max(max, lv);
    }
    expect(max - min).toBeLessThan(2);
    return max;
  }

  let randomSize = random(1000, 2000);
  const doc = cp.createDocument('', 'plaintext');
  const data = doc.get(0).parent.parent;
  const lines = [''];

  it('should insert random data sequentially', () => {
    for (let i = 1; i < randomSize; i++) {
      const content = random(0, randomSize) + '';
      const height = random(1, 100);
      const line = new Line(content, height);

      lines.push(content);
      data.insert(i, [line]);
      expect(data.get(i)).toBe(line);
    }
  });

  it('should return null if index is out of range', () => {
    expect(data.get(data.size)).toBeNull();
    expect(data.get(-1)).toBeNull();
  });

  it('should go over the lines', () => {
    testOrder();
  });

  it('should go over the lines in reverse order', () => {
    let lastIndex = data.size;
    data.forEachRight((line, index) => {
      expect(--lastIndex).toBe(index);
      expect(line).toBe(data.get(index));
    });
  });

  it('should have correct size', () => {
    expect(data.size).toBe(randomSize);
  });

  it('should have correct height', () => {
    testLinesHeight();
  });

  it('should allow to find line index', () => {
    repeat(500, () => {
      const r = random(0, randomSize - 1);
      const line = data.get(r);
      expect(line.getIndex()).toBe(r);
    });
  });

  it('should allow to find line by its offset', () => {
    repeat(500, () => {
      const r = random(0, randomSize - 1);
      const line = data.get(r);
      const lineByOffset = data.getLineWithOffset(line.getOffset());

      expect(lineByOffset.text).toBe(lines[r]);
      expect(lineByOffset.getIndex()).toBe(r);
    });
  });

  it('should return extreme lines if offset is out of range', () => {
    const last = data.getLineWithOffset(data.height);
    const first = data.getLineWithOffset(-1);

    expect(last).toBe(data.get(data.size - 1));
    expect(first).toBe(data.get(0));
  });

  it('should allow to insert a bunch of lines', () => {
    repeat(50, () => {
      const bunch = [];
      const bunchSize = random(30, 60);
      const at = random(0, randomSize);

      for (let i = 0; i < bunchSize; i++) {
        const content = random(0, randomSize) + '';
        const height = random(1, 100);
        const line = new Line(content, height);

        lines.splice(at + i, 0, content);
        bunch.push(line);
      }

      data.insert(at, bunch);
      randomSize += bunchSize;

      expect(data.size).toBe(randomSize);
      testOrder();
      testLinesHeight();
    });
  });

  it('should allow to remove a bunch of lines', () => {
    repeat(50, () => {
      const bunchSize = random(30, 60);
      const at = random(0, randomSize - bunchSize);

      data.remove(at, bunchSize);
      lines.splice(at, bunchSize);
      randomSize -= bunchSize;

      expect(data.size).toBe(randomSize);
      expect(data.size).toBe(lines.length);
      testOrder();
      testLinesHeight();
    });
  });

  it('shouldn\'t be strongly unbalanced', () => {
    getBranchDeepLevel(data, 0);
  });

  it('should allow to get next line', () => {
    const reducer = (acc, line) => {
      expect(acc).toBe(line);
      return line.next();
    };
    const afterLast = data.reduce(reducer, data.get(0));
    expect(afterLast).toBeNull();
  });

  it('should allow to get previous line', () => {
    const reducer = (acc, line) => {
      expect(acc).toBe(line);
      return line.prev();
    };
    const beforeFirst = data.reduceRight(reducer, data.get(data.size - 1));
    expect(beforeFirst).toBeNull();
  });
});
