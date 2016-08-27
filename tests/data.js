// CodePrinter - tests for data structure

describe('Data', function() {
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function repeat(times, f) {
    for (var i = 0; i < times; i++) f(i);
  }

  function testOrder() {
    data.foreach(function(line, index) {
      expect(line.text).toBe(lines[index]);
    });
  }

  function testLinesHeight() {
    var height = 0;
    data.foreach(function(line) {
      height += line.height;
    });
    expect(data.height).toBe(height);
  }

  function getBranchDeepLevel(branch, level) {
    if (branch.isLeaf) return level;

    var min = Infinity, max = level;

    for (var i = 0; i < branch.children.length; i++) {
      var lv = getBranchDeepLevel(branch.children[i], level + 1);
      min = Math.min(min, lv);
      max = Math.max(max, lv);
    }
    expect(max - min).toBeLessThan(3);
    return max;
  }

  var doc = cp.createDocument('', 'plaintext');
  var randomSize = random(1000, 2000);
  var Line = doc.get(0).constructor;
  var data = doc.get(0).parent.parent;
  var lines = [''];

  beforeAll(function() {
    cp.setDocument(doc);
  });

  it('should insert random data sequentially', function() {
    for (var i = 1; i < randomSize; i++) {
      var content = random(0, randomSize) + '';
      var height = random(1, 100);
      var line = new Line(content, height);

      lines.push(content);
      data.insert(i, [line]);
      expect(data.get(i)).toBe(line);
    }
  });

  it('should go over the lines in the correct order', function() {
    testOrder();
  });

  it('should have correct size', function() {
    expect(data.size).toBe(randomSize);
  });

  it('should have correct height', function() {
    testLinesHeight();
  });

  it('should allow to find line index', function() {
    repeat(500, function() {
      var r = random(0, randomSize - 1);
      var line = data.get(r);
      expect(line.getIndex()).toBe(r);
    });
  });

  it('should allow to find line by its offset', function() {
    repeat(500, function() {
      var r = random(0, randomSize - 1);
      var line = data.get(r);
      var offset = line.getOffset();
      var lineByOffset = data.getLineWithOffset(offset);

      expect(lineByOffset.text).toBe(lines[r]);
      expect(lineByOffset.getIndex()).toBe(r);
    });
  });

  it('should allow to insert a bunch of lines', function() {
    repeat(50, function() {
      var bunch = [];
      var bunchSize = random(30, 60);
      var at = random(0, randomSize);

      for (var i = 0; i < bunchSize; i++) {
        var content = random(0, randomSize) + '';
        var height = random(1, 100);
        var line = new Line(content, height);

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

  it('should allow to remove a bunch of lines', function() {
    repeat(50, function() {
      var bunchSize = random(30, 60);
      var at = random(0, randomSize - bunchSize);

      data.remove(at, bunchSize);
      lines.splice(at, bunchSize);
      randomSize -= bunchSize;

      expect(data.size).toBe(randomSize);
      expect(data.size).toBe(lines.length);
      testOrder();
      testLinesHeight();
    });
  });

  it('shouldn\'t be strongly unbalanced', function() {
    getBranchDeepLevel(data, 0);
  });

  it('should allow to get next line', function() {
    var line = data.get(0);
    for (var i = 1; i < randomSize && line; i++) {
      line = line.next();
      expect(line && line.text).toBe(lines[i]);
    }
    expect(line.next()).toBeNull();
  });

  it('should allow to get previous line', function() {
    var line = data.get(randomSize - 1);
    for (var i = randomSize - 2; i >= 0; i--) {
      line = line.prev();
      expect(line && line.text).toBe(lines[i]);
    }
    expect(line.prev()).toBeNull();
  });
});
